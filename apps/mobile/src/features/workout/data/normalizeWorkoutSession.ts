/**
 * Safe parse/normalize of persisted WorkoutSession aggregates.
 *
 * SQLite stores the aggregate as JSON. Older/corrupt rows may omit `steps`
 * (or nest incomplete step shapes). Call sites across mobile historically
 * assumed `session.steps` is always an array — that caused Android JS
 * runtime crashes (`Cannot read properties of undefined (reading 'length')`)
 * after process restart when hydrating a checkpoint/resumable session.
 *
 * Domain reducer and sessionProjections already nullish-coalesce steps; the
 * load boundary must do the same so UI/controller never see a partial shape.
 */
import type {
  SessionSetLog,
  SessionStatus,
  SessionStepSnapshot,
  SessionStepState,
  WorkoutSession,
} from '@forma/workout-domain';

const SESSION_STATUSES: ReadonlySet<string> = new Set([
  'prepared',
  'active',
  'paused',
  'completed',
  'abandoned',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normalizeSnapshot(raw: unknown): SessionStepSnapshot | null {
  if (!isRecord(raw)) return null;
  const stepIndex = finiteNumber(raw.stepIndex);
  const targetSets = finiteNumber(raw.targetSets);
  const targetReps = finiteNumber(raw.targetReps);
  const targetWeightKg = finiteNumber(raw.targetWeightKg);
  const restSeconds = finiteNumber(raw.restSeconds);
  if (
    stepIndex === null ||
    targetSets === null ||
    targetReps === null ||
    targetWeightKg === null ||
    restSeconds === null
  ) {
    return null;
  }
  if (typeof raw.exerciseId !== 'string' || typeof raw.name !== 'string') {
    return null;
  }
  return {
    stepIndex,
    exerciseId: raw.exerciseId,
    exerciseRevisionId:
      typeof raw.exerciseRevisionId === 'string' ? raw.exerciseRevisionId : raw.exerciseId,
    name: raw.name,
    targetSets,
    targetReps,
    targetWeightKg,
    restSeconds,
  };
}

function normalizeSetLog(raw: unknown): SessionSetLog | null {
  if (!isRecord(raw)) return null;
  const setNo = finiteNumber(raw.setNo);
  const weightKg = finiteNumber(raw.weightKg);
  const reps = finiteNumber(raw.reps);
  const completedAtMs = finiteNumber(raw.completedAtMs);
  if (setNo === null || weightKg === null || reps === null || completedAtMs === null) {
    return null;
  }
  if (typeof raw.eventId !== 'string') return null;
  const out: SessionSetLog = {
    setNo,
    weightKg,
    reps,
    completedAtMs,
    eventId: raw.eventId,
  };
  const rir = finiteNumber(raw.rir);
  if (rir !== null) out.rir = rir;
  return out;
}

function normalizeStep(raw: unknown): SessionStepState | null {
  if (!isRecord(raw)) return null;
  const snapshot = normalizeSnapshot(raw.snapshot);
  if (!snapshot) return null;
  const completedRaw = Array.isArray(raw.completedSets) ? raw.completedSets : [];
  const completedSets: SessionSetLog[] = [];
  for (const item of completedRaw) {
    const log = normalizeSetLog(item);
    if (log) completedSets.push(log);
  }
  return {
    snapshot,
    completedSets,
    skipped: raw.skipped === true,
    skipReason:
      typeof raw.skipReason === 'string'
        ? (raw.skipReason as SessionStepState['skipReason'])
        : undefined,
  };
}

/**
 * Normalize an unknown JSON value into a WorkoutSession.
 * Missing/non-array `steps` becomes `[]` (never undefined).
 */
export function normalizeWorkoutSession(raw: unknown): WorkoutSession | null {
  if (!isRecord(raw)) return null;
  if (typeof raw.sessionId !== 'string' || raw.sessionId.length < 1) return null;
  if (typeof raw.userId !== 'string' || raw.userId.length < 1) return null;
  if (typeof raw.status !== 'string' || !SESSION_STATUSES.has(raw.status)) return null;
  if (typeof raw.templateRevisionId !== 'string') return null;
  if (typeof raw.contentHash !== 'string') return null;
  if (typeof raw.localStartDate !== 'string') return null;
  if (typeof raw.timezone !== 'string') return null;

  const currentStepIndex = finiteNumber(raw.currentStepIndex);
  const lastEventOrdinal = finiteNumber(raw.lastEventOrdinal);
  const rowVersion = finiteNumber(raw.rowVersion);
  if (currentStepIndex === null || lastEventOrdinal === null || rowVersion === null) {
    return null;
  }

  const stepsRaw = Array.isArray(raw.steps) ? raw.steps : [];
  const steps: SessionStepState[] = [];
  for (const item of stepsRaw) {
    const step = normalizeStep(item);
    if (step) steps.push(step);
  }

  const restEndsAtMs =
    raw.restEndsAtMs === null ? null : finiteNumber(raw.restEndsAtMs);
  if (raw.restEndsAtMs != null && restEndsAtMs === null) return null;

  const startedAtMs =
    raw.startedAtMs === null || raw.startedAtMs === undefined
      ? null
      : finiteNumber(raw.startedAtMs);
  if (raw.startedAtMs != null && raw.startedAtMs !== undefined && startedAtMs === null) {
    return null;
  }

  const completedAtMs =
    raw.completedAtMs === null || raw.completedAtMs === undefined
      ? null
      : finiteNumber(raw.completedAtMs);
  if (raw.completedAtMs != null && raw.completedAtMs !== undefined && completedAtMs === null) {
    return null;
  }

  const session: WorkoutSession = {
    sessionId: raw.sessionId,
    userId: raw.userId,
    status: raw.status as SessionStatus,
    templateRevisionId: raw.templateRevisionId,
    contentHash: raw.contentHash,
    steps,
    currentStepIndex,
    restEndsAtMs: restEndsAtMs ?? null,
    startedAtMs: startedAtMs ?? null,
    completedAtMs: completedAtMs ?? null,
    lastEventOrdinal,
    rowVersion,
    localStartDate: raw.localStartDate,
    timezone: raw.timezone,
  };

  if (typeof raw.terminalReason === 'string') {
    session.terminalReason = raw.terminalReason as WorkoutSession['terminalReason'];
  }
  const weightKgSnapshot = finiteNumber(raw.weightKgSnapshot);
  if (weightKgSnapshot !== null && weightKgSnapshot > 0) {
    session.weightKgSnapshot = weightKgSnapshot;
  }

  return session;
}

/** Parse aggregate_json from SQLite. Returns null on invalid JSON or shape. */
export function parseWorkoutSessionJson(json: string): WorkoutSession | null {
  try {
    return normalizeWorkoutSession(JSON.parse(json) as unknown);
  } catch {
    return null;
  }
}
