/**
 * P1.3 — Projection hooks after accepted sync ops (architecture plan §1.3).
 *
 * - MemoryProjectionService: default / tests (no DB).
 * - PostgresProjectionService:
 *   - engagement.activity_credit (terminal sessions)
 *   - workout.pr_observation (soft PR from projection.setLogs)
 *   - session materialize + promote soft PR → exercise_record
 *
 * Note: avoid TS parameter properties — node --experimental-strip-types
 * does not support them.
 */

import { randomUUID } from 'node:crypto';
import {
  materializeSessionChildren,
  materializeWorkoutSession,
  promoteSoftPrToExerciseRecord,
} from './sessionMaterialize.ts';

export type ProjectionInput = {
  user_id: string;
  aggregate_type: string;
  aggregate_id: string;
  payload: Record<string, unknown>;
  /** Client device_id from the push op (needed for session materialize). */
  device_id?: string;
};

export interface ProjectionService {
  onAccepted(input: ProjectionInput): Promise<void>;
}

/**
 * Callable sql tag (postgres package). Kept structural/loose so we do not
 * import postgres.ts at module load (strip-types + circular risk).
 * Also accepts a transaction client (postgres.Resolvable).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SqlClient = any;

/** Bump when credit policy rules change (unique with source entity). */
export const ACTIVITY_CREDIT_POLICY_VERSION = 1;

const CREDIT_STATUSES = new Set([
  'completed',
  'abandoned',
  'voided',
  'user_finished_partial',
  'user_left',
]);

const CREDIT_EVENTS = new Set([
  'complete_session',
  'abandon_session',
  'finish_partial',
  'session_completed',
  'session_abandoned',
]);

export function isWorkoutSessionAggregate(type: string): boolean {
  return type === 'workout_session' || type === 'session';
}

/**
 * True when payload indicates a terminal session outcome worth a day credit.
 * Intermediate events (complete_set, pause) do not credit.
 */
export function shouldGrantActivityCredit(
  input: ProjectionInput,
): boolean {
  if (!isWorkoutSessionAggregate(input.aggregate_type)) return false;
  const p = input.payload ?? {};

  const status =
    typeof p.status === 'string'
      ? p.status
      : typeof p.session_status === 'string'
        ? p.session_status
        : null;
  if (status && CREDIT_STATUSES.has(status)) return true;

  const event =
    typeof p.event === 'string'
      ? p.event
      : typeof p.event_type === 'string'
        ? p.event_type
        : null;
  if (event && CREDIT_EVENTS.has(event)) return true;

  if (p.completed === true || p.finished === true) return true;

  return false;
}

/**
 * Local calendar date for credit (YYYY-MM-DD), as reported by the client.
 * Returns null when the payload carries no local date — NEVER falls back
 * to the server's UTC date: that would shift credits a day for UTC+N users.
 * Callers must skip the credit (with a warning) when null.
 */
export function extractLocalDate(
  payload: Record<string, unknown>,
): string | null {
  const candidates = [
    payload.local_date,
    payload.localDate,
    payload.local_start_date,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && /^\d{4}-\d{2}-\d{2}/.test(c)) {
      return c.slice(0, 10);
    }
  }
  return null;
}

export type ActivityCreditRow = {
  credit_id: string;
  user_id: string;
  local_date: string;
  source_domain: 'workout';
  source_entity_id: string;
  policy_version: number;
};

export type ExerciseRecordRow = {
  user_id: string;
  exercise_key: string;
  record_kind: 'max_load' | 'max_volume' | 'max_reps';
  value: number;
  source_session_id: string;
  achieved_at: string;
};

/**
 * Soft max_load candidates from enriched push payload.
 * Prefers projection.setLogs (mobile enrichment), falls back to payload.sets.
 */
export function extractMaxLoadCandidates(
  input: ProjectionInput,
): ExerciseRecordRow[] {
  const out: ExerciseRecordRow[] = [];
  const seen = new Map<string, number>(); // exercise_key -> best index in out
  const local = extractLocalDate(input.payload);
  const achievedAt = local
    ? `${local}T12:00:00.000Z`
    : new Date().toISOString();

  const consider = (exerciseKey: string, weight: number) => {
    if (!(weight > 0) || !exerciseKey) return;
    const prevIdx = seen.get(exerciseKey);
    if (prevIdx != null) {
      if (weight > out[prevIdx].value) {
        out[prevIdx] = {
          ...out[prevIdx],
          value: weight,
          source_session_id: input.aggregate_id,
        };
      }
      return;
    }
    seen.set(exerciseKey, out.length);
    out.push({
      user_id: input.user_id,
      exercise_key: exerciseKey,
      record_kind: 'max_load',
      value: weight,
      source_session_id: input.aggregate_id,
      achieved_at: achievedAt,
    });
  };

  const projection = input.payload.projection;
  if (projection && typeof projection === 'object') {
    const setLogs = (projection as Record<string, unknown>).setLogs;
    if (Array.isArray(setLogs)) {
      for (const raw of setLogs) {
        if (!raw || typeof raw !== 'object') continue;
        const s = raw as Record<string, unknown>;
        const key =
          typeof s.exerciseId === 'number'
            ? String(s.exerciseId)
            : typeof s.exerciseId === 'string'
              ? s.exerciseId
              : typeof s.exercise_id === 'number'
                ? String(s.exercise_id)
                : typeof s.exercise_id === 'string'
                  ? s.exercise_id
                  : null;
        const w =
          typeof s.weight === 'number'
            ? s.weight
            : typeof s.load_kg === 'number'
              ? s.load_kg
              : null;
        if (key && w != null) consider(key, w);
      }
    }
  }

  if (out.length === 0 && Array.isArray(input.payload.sets)) {
    for (const raw of input.payload.sets) {
      if (!raw || typeof raw !== 'object') continue;
      const s = raw as Record<string, unknown>;
      const key =
        typeof s.exercise_id === 'number'
          ? String(s.exercise_id)
          : typeof s.exercise_id === 'string'
            ? s.exercise_id
            : typeof s.exerciseId === 'number'
              ? String(s.exerciseId)
              : null;
      const w =
        typeof s.load_kg === 'number'
          ? s.load_kg
          : typeof s.weight === 'number'
            ? s.weight
            : null;
      if (key && w != null) consider(key, w);
    }
  }

  return out;
}

function mergeSoftRecords(
  records: ExerciseRecordRow[],
  candidates: ExerciseRecordRow[],
): void {
  for (const c of candidates) {
    const prev = records.find(
      (r) =>
        r.user_id === c.user_id &&
        r.exercise_key === c.exercise_key &&
        r.record_kind === c.record_kind,
    );
    if (!prev || c.value > prev.value) {
      if (prev) {
        prev.value = c.value;
        prev.source_session_id = c.source_session_id;
        prev.achieved_at = c.achieved_at;
      } else {
        records.push({ ...c });
      }
    }
  }
}

/** No-op — keeps push path free of side effects when explicitly chosen. */
export class NoopProjectionService implements ProjectionService {
  async onAccepted(_input: ProjectionInput): Promise<void> {
    /* intentional */
  }
}

/**
 * In-memory projections for tests and non-Postgres deploys.
 * Tracks activity credits (idempotent per session) and soft PR candidates.
 */
export class MemoryProjectionService implements ProjectionService {
  readonly credits: ActivityCreditRow[] = [];
  readonly records: ExerciseRecordRow[] = [];

  async onAccepted(input: ProjectionInput): Promise<void> {
    if (isWorkoutSessionAggregate(input.aggregate_type)) {
      mergeSoftRecords(this.records, extractMaxLoadCandidates(input));
    }

    if (!shouldGrantActivityCredit(input)) return;

    const exists = this.credits.some(
      (c) =>
        c.source_entity_id === input.aggregate_id &&
        c.policy_version === ACTIVITY_CREDIT_POLICY_VERSION,
    );
    if (exists) return;

    const localDate = extractLocalDate(input.payload);
    if (!localDate) {
      console.warn(
        '[fitpulse-api] activity_credit skipped: no local_date in payload',
        { aggregate_id: input.aggregate_id },
      );
      return;
    }

    this.credits.push({
      credit_id: randomUUID(),
      user_id: input.user_id,
      local_date: localDate,
      source_domain: 'workout',
      source_entity_id: input.aggregate_id,
      policy_version: ACTIVITY_CREDIT_POLICY_VERSION,
    });
  }
}

/**
 * Postgres: activity_credit + pr_observation + session materialize.
 * sql may be a transaction client — then work is atomic with the accepted op.
 */
export class PostgresProjectionService implements ProjectionService {
  private readonly sql: SqlClient;

  constructor(sql: SqlClient) {
    this.sql = sql;
  }

  async onAccepted(input: ProjectionInput): Promise<void> {
    if (!isWorkoutSessionAggregate(input.aggregate_type)) return;

    await this.sql`
      INSERT INTO platform.app_user (user_id, auth_subject)
      VALUES (${input.user_id}::uuid, ${input.user_id})
      ON CONFLICT (user_id) DO NOTHING
    `;

    // Soft PR observations (no catalog/session FK)
    const candidates = extractMaxLoadCandidates(input);
    for (const c of candidates) {
      await this.sql`
        INSERT INTO workout.pr_observation (
          user_id,
          exercise_key,
          record_kind,
          value,
          source_session_id,
          achieved_at
        ) VALUES (
          ${c.user_id}::uuid,
          ${c.exercise_key},
          ${c.record_kind},
          ${c.value},
          ${c.source_session_id}::uuid,
          ${c.achieved_at}::timestamptz
        )
        ON CONFLICT (user_id, exercise_key, record_kind) DO UPDATE SET
          value = EXCLUDED.value,
          source_session_id = EXCLUDED.source_session_id,
          achieved_at = EXCLUDED.achieved_at
        WHERE workout.pr_observation.value < EXCLUDED.value
      `;
    }

    // Session row + steps/sets + promote soft → hard exercise_record
    if (input.device_id) {
      try {
        const ok = await materializeWorkoutSession(this.sql, {
          user_id: input.user_id,
          aggregate_id: input.aggregate_id,
          device_id: input.device_id,
          payload: input.payload,
        });
        if (ok) {
          await materializeSessionChildren(
            this.sql,
            input.aggregate_id,
            input.payload,
          );
          await promoteSoftPrToExerciseRecord(
            this.sql,
            input.user_id,
            input.aggregate_id,
          );
        }
      } catch (err) {
        console.error(
          '[fitpulse-api] session materialize failed',
          { aggregate_id: input.aggregate_id },
          err,
        );
      }
    }

    if (!shouldGrantActivityCredit(input)) return;

    const localDate = extractLocalDate(input.payload);
    if (!localDate) {
      console.warn(
        '[fitpulse-api] activity_credit skipped: no local_date in payload',
        { aggregate_id: input.aggregate_id },
      );
      return;
    }

    const creditId = randomUUID();
    await this.sql`
      INSERT INTO engagement.activity_credit (
        credit_id,
        user_id,
        local_date,
        source_domain,
        source_entity_id,
        policy_version
      ) VALUES (
        ${creditId}::uuid,
        ${input.user_id}::uuid,
        ${localDate}::date,
        'workout',
        ${input.aggregate_id}::uuid,
        ${ACTIVITY_CREDIT_POLICY_VERSION}
      )
      ON CONFLICT (source_domain, source_entity_id, policy_version) DO NOTHING
    `;
  }
}

export const defaultProjectionService = new MemoryProjectionService();
