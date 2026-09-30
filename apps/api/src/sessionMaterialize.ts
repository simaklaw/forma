import { createHash } from 'node:crypto';
/**
 * Server-side session materialization (soft → hard path).
 *
 * Accepted workout_session sync ops upsert a minimal workout.workout_session
 * row (system template revision from 006 seed) so exercise_record FK is
 * satisfiable. Soft pr_observation is promoted when exercise_key maps to a
 * catalog revision.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SqlClient = any;

/** System template revision seeded in 006_session_materialize_seed.sql */
export const SYSTEM_TEMPLATE_REVISION_ID =
  '00000000-0000-4000-8000-00000000f002';

const SESSION_STATUSES = new Set([
  'prepared',
  'active',
  'paused',
  'completed',
  'abandoned',
  'voided',
]);

/** Map client/domain status strings onto workout.session_status enum. */
export function mapSessionStatus(raw: unknown): string {
  if (typeof raw !== 'string') return 'completed';
  if (SESSION_STATUSES.has(raw)) return raw;
  if (
    raw === 'user_finished_partial' ||
    raw === 'finish_partial' ||
    raw === 'session_completed'
  ) {
    return 'completed';
  }
  if (
    raw === 'user_left' ||
    raw === 'abandon_session' ||
    raw === 'session_abandoned'
  ) {
    return 'abandoned';
  }
  return 'completed';
}

export function extractStatus(payload: Record<string, unknown>): string {
  return mapSessionStatus(
    payload.status ?? payload.session_status ?? payload.event,
  );
}

export type MaterializeInput = {
  user_id: string;
  aggregate_id: string;
  device_id?: string;
  payload: Record<string, unknown>;
};

/**
 * Upsert a minimal workout_session for the aggregate.
 * Requires 006 seed (system template) and a device row (ensureDevice).
 */
export async function materializeWorkoutSession(
  sql: SqlClient,
  input: MaterializeInput,
): Promise<boolean> {
  const localDate =
    typeof input.payload.local_start_date === 'string'
      ? input.payload.local_start_date.slice(0, 10)
      : typeof input.payload.local_date === 'string'
        ? input.payload.local_date.slice(0, 10)
        : null;
  if (!localDate || !/^\d{4}-\d{2}-\d{2}$/.test(localDate)) return false;

  const deviceId =
    input.device_id &&
    /^[0-9a-f-]{36}$/i.test(input.device_id)
      ? input.device_id
      : null;
  if (!deviceId) return false;

  const status = extractStatus(input.payload);
  const phase =
    status === 'completed' || status === 'abandoned' || status === 'voided'
      ? 'completed'
      : status === 'paused'
        ? 'paused'
        : 'exercise';
  const snapshot = JSON.stringify({
    source: 'sync_materialize',
    status,
    local_start_date: localDate,
  });
  const snapshotHash = (input.aggregate_id.replace(/-/g, '') + '0'.repeat(64)).slice(
    0,
    64,
  );

  await sql`
    INSERT INTO workout.workout_session (
      session_id,
      user_id,
      created_by_device_id,
      template_revision_id,
      status,
      phase,
      local_start_date,
      timezone_at_start,
      snapshot,
      snapshot_hash,
      last_event_ordinal,
      row_version,
      idempotency_key,
      ended_at
    ) VALUES (
      ${input.aggregate_id}::uuid,
      ${input.user_id}::uuid,
      ${deviceId}::uuid,
      ${SYSTEM_TEMPLATE_REVISION_ID}::uuid,
      ${status}::workout.session_status,
      ${phase}::workout.session_phase,
      ${localDate}::date,
      'UTC',
      ${snapshot}::jsonb,
      ${snapshotHash},
      1,
      1,
      ${input.aggregate_id}::uuid,
      CASE
        WHEN ${status} IN ('completed', 'abandoned', 'voided') THEN now()
        ELSE NULL
      END
    )
    ON CONFLICT (session_id) DO UPDATE SET
      status = EXCLUDED.status,
      phase = EXCLUDED.phase,
      ended_at = COALESCE(EXCLUDED.ended_at, workout.workout_session.ended_at),
      row_version = workout.workout_session.row_version + 1,
      updated_at = now()
  `;
  return true;
}

export async function promoteSoftPrToExerciseRecord(
  sql: SqlClient,
  userId: string,
  sessionId: string,
): Promise<number> {
  const result = await sql`
    INSERT INTO workout.exercise_record (
      user_id,
      exercise_revision_id,
      record_kind,
      value,
      source_session_id,
      achieved_at
    )
    SELECT
      o.user_id,
      m.exercise_revision_id,
      o.record_kind,
      o.value,
      o.source_session_id,
      o.achieved_at
    FROM workout.pr_observation o
    JOIN catalog.exercise_key_map m ON m.exercise_key = o.exercise_key
    WHERE o.user_id = ${userId}::uuid
      AND o.source_session_id = ${sessionId}::uuid
      AND o.record_kind = 'max_load'
    ON CONFLICT (user_id, exercise_revision_id, record_kind) DO UPDATE SET
      value = EXCLUDED.value,
      source_session_id = EXCLUDED.source_session_id,
      achieved_at = EXCLUDED.achieved_at
    WHERE workout.exercise_record.value < EXCLUDED.value
  `;
  return Array.isArray(result) ? result.length : 0;
}

export function detUuid(namespace: string, name: string): string {
  const h = createHash('sha1').update(namespace).update('\0').update(name).digest();
  h[6] = (h[6] & 0x0f) | 0x50;
  h[8] = (h[8] & 0x3f) | 0x80;
  const hex = h.subarray(0, 16).toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

export type ParsedSetLog = {
  exerciseKey: string;
  weight: number | null;
  reps: number | null;
};

export function parseSetLogsFromPayload(
  payload: Record<string, unknown>,
): ParsedSetLog[] {
  const out: ParsedSetLog[] = [];
  const projection = payload.projection;
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
        if (!key) continue;
        out.push({
          exerciseKey: key,
          weight:
            typeof s.weight === 'number'
              ? s.weight
              : typeof s.load_kg === 'number'
                ? s.load_kg
                : null,
          reps: typeof s.reps === 'number' ? s.reps : null,
        });
      }
    }
  }
  if (out.length === 0 && Array.isArray(payload.sets)) {
    for (const raw of payload.sets) {
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
      if (!key) continue;
      out.push({
        exerciseKey: key,
        weight:
          typeof s.load_kg === 'number'
            ? s.load_kg
            : typeof s.weight === 'number'
              ? s.weight
              : null,
        reps: typeof s.reps === 'number' ? s.reps : null,
      });
    }
  }
  return out;
}

export type StepPlan = {
  exerciseKey: string;
  sequenceNo: number;
  sets: ParsedSetLog[];
};

export function planStepsFromSetLogs(logs: ParsedSetLog[]): StepPlan[] {
  const order: string[] = [];
  const byKey = new Map<string, ParsedSetLog[]>();
  for (const log of logs) {
    if (!byKey.has(log.exerciseKey)) {
      order.push(log.exerciseKey);
      byKey.set(log.exerciseKey, []);
    }
    byKey.get(log.exerciseKey)!.push(log);
  }
  return order.map((key, i) => ({
    exerciseKey: key,
    sequenceNo: i + 1,
    sets: byKey.get(key)!,
  }));
}

export async function materializeSessionChildren(
  sql: SqlClient,
  sessionId: string,
  payload: Record<string, unknown>,
): Promise<{ steps: number; sets: number }> {
  const plans = planStepsFromSetLogs(parseSetLogsFromPayload(payload));
  if (plans.length === 0) return { steps: 0, sets: 0 };

  let steps = 0;
  let sets = 0;

  for (const plan of plans) {
    const mapRows = await sql`
      SELECT exercise_revision_id::text AS rid
      FROM catalog.exercise_key_map
      WHERE exercise_key = ${plan.exerciseKey}
      LIMIT 1
    `;
    const rid = mapRows?.[0]?.rid as string | undefined;
    if (!rid) continue;

    const stepId = detUuid(sessionId, `step:${plan.sequenceNo}:${plan.exerciseKey}`);

    await sql`
      INSERT INTO workout.session_step (
        session_step_id,
        session_id,
        sequence_no,
        exercise_revision_id,
        status,
        completed_at
      ) VALUES (
        ${stepId}::uuid,
        ${sessionId}::uuid,
        ${plan.sequenceNo},
        ${rid}::uuid,
        'completed'::workout.step_status,
        now()
      )
      ON CONFLICT (session_id, sequence_no) DO UPDATE SET
        exercise_revision_id = EXCLUDED.exercise_revision_id,
        status = EXCLUDED.status,
        completed_at = COALESCE(workout.session_step.completed_at, EXCLUDED.completed_at)
    `;
    steps += 1;

    const stepRows = await sql`
      SELECT session_step_id::text AS id
      FROM workout.session_step
      WHERE session_id = ${sessionId}::uuid AND sequence_no = ${plan.sequenceNo}
      LIMIT 1
    `;
    const realStepId = (stepRows?.[0]?.id as string | undefined) ?? stepId;

    let setNo = 0;
    for (const log of plan.sets) {
      setNo += 1;
      const setId = detUuid(realStepId, `set:${setNo}`);
      await sql`
        INSERT INTO workout.session_set (
          session_set_id,
          session_step_id,
          set_no,
          status,
          repetitions,
          load_kg,
          completed_at
        ) VALUES (
          ${setId}::uuid,
          ${realStepId}::uuid,
          ${setNo},
          'completed'::workout.set_status,
          ${log.reps},
          ${log.weight},
          now()
        )
        ON CONFLICT (session_step_id, set_no) DO UPDATE SET
          status = EXCLUDED.status,
          repetitions = COALESCE(EXCLUDED.repetitions, workout.session_set.repetitions),
          load_kg = COALESCE(EXCLUDED.load_kg, workout.session_set.load_kg),
          completed_at = COALESCE(workout.session_set.completed_at, EXCLUDED.completed_at)
      `;
      sets += 1;
    }
  }

  return { steps, sets };
}
