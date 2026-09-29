/**
 * P1.3 — Projection hooks after accepted sync ops (architecture plan §1.3).
 *
 * - MemoryProjectionService: default / tests (no DB).
 * - PostgresProjectionService: upserts engagement.activity_credit.
 * - exercise_record needs workout.session + catalog.exercise_revision rows;
 *   deferred until server-side session materialization lands.
 *
 * Note: avoid TS parameter properties — node --experimental-strip-types
 * does not support them.
 */

import { randomUUID } from 'node:crypto';

export type ProjectionInput = {
  user_id: string;
  aggregate_type: string;
  aggregate_id: string;
  payload: Record<string, unknown>;
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
    } else {
      this.credits.push({
        credit_id: randomUUID(),
        user_id: input.user_id,
        local_date: localDate,
        source_domain: 'workout',
        source_entity_id: input.aggregate_id,
        policy_version: ACTIVITY_CREDIT_POLICY_VERSION,
      });
    }

    // Soft PR candidates from payload.sets / payload.records (no FK).
    const sets = input.payload.sets;
    if (Array.isArray(sets)) {
      for (const raw of sets) {
        if (!raw || typeof raw !== 'object') continue;
        const s = raw as Record<string, unknown>;
        const load =
          typeof s.load_kg === 'number'
            ? s.load_kg
            : typeof s.weight === 'number'
              ? s.weight
              : null;
        const exKey =
          typeof s.exercise_id === 'string'
            ? s.exercise_id
            : typeof s.exercise_id === 'number'
              ? String(s.exercise_id)
              : null;
        if (load == null || load <= 0 || !exKey) continue;
        const prev = this.records.find(
          (r) =>
            r.user_id === input.user_id &&
            r.exercise_key === exKey &&
            r.record_kind === 'max_load',
        );
        if (!prev || load > prev.value) {
          if (prev) {
            prev.value = load;
            prev.source_session_id = input.aggregate_id;
            prev.achieved_at = new Date().toISOString();
          } else {
            this.records.push({
              user_id: input.user_id,
              exercise_key: exKey,
              record_kind: 'max_load',
              value: load,
              source_session_id: input.aggregate_id,
              achieved_at: new Date().toISOString(),
            });
          }
        }
      }
    }
  }
}

/**
 * Postgres: engagement.activity_credit on terminal workout_session ops.
 * Idempotent via UNIQUE (source_domain, source_entity_id, policy_version).
 * sql may be a transaction client — then the credit is atomic with the
 * accepted operation itself.
 */
export class PostgresProjectionService implements ProjectionService {
  private readonly sql: SqlClient;

  constructor(sql: SqlClient) {
    this.sql = sql;
  }

  async onAccepted(input: ProjectionInput): Promise<void> {
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
      INSERT INTO platform.app_user (user_id, auth_subject)
      VALUES (${input.user_id}::uuid, ${input.user_id})
      ON CONFLICT (user_id) DO NOTHING
    `;

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
