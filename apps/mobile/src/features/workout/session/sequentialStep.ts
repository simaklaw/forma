import type { WorkoutSession } from '@forma/workout-domain';

/**
 * Reject a resumable session that belongs to another selected day or whose
 * frozen exercise order no longer matches the visible plan. This prevents a
 * stale snapshot from displaying an unrelated "next exercise" in the sheet.
 */
export interface ExerciseIdentity {
  id: number;
  name: string;
}

export function sessionMatchesDayAndExercises(
  session: WorkoutSession | null,
  dayId: string | undefined,
  exercises: readonly ExerciseIdentity[] | undefined
): boolean {
  if (!session) return false;

  const match = /^day-([^@]+)(?:@.*)?$/.exec(session.templateRevisionId);
  if (dayId && (!match || match[1] !== dayId)) return false;

  if (!exercises?.length) return true;
  const steps = session.steps ?? [];
  return steps.length === exercises.length &&
    steps.every((step, index) =>
      step.snapshot.exerciseId === String(exercises[index]?.id) &&
      step.snapshot.name === exercises[index]?.name
    );
}

export interface SequentialStepInfo {
  /** True when this exercise is the session's currentStepIndex target. */
  isCurrent: boolean;
  /** Display name of the exercise the user should do next (if not current). */
  expectedName: string | null;
  /** Exercise id of the expected step, or null if none / finished. */
  expectedExerciseId: number | null;
  currentStepIndex: number;
  totalSteps: number;
}

/**
 * Pure helper: given a session snapshot and an exercise id, whether logging
 * a set is allowed (matches domain recordSetForExercise null path).
 */
export function sequentialStepInfo(
  session: WorkoutSession | null,
  exerciseId: number,
  nameById: (id: number) => string | undefined
): SequentialStepInfo {
  if (!session || session.status === 'completed' || session.status === 'abandoned') {
    return {
      isCurrent: true,
      expectedName: null,
      expectedExerciseId: null,
      currentStepIndex: 0,
      totalSteps: 0
    };
  }

  const steps = session.steps ?? [];
  const step = steps[session.currentStepIndex];
  if (!step) {
    return {
      isCurrent: false,
      expectedName: null,
      expectedExerciseId: null,
      currentStepIndex: session.currentStepIndex,
      totalSteps: steps.length
    };
  }

  const expectedId = Number(step.snapshot.exerciseId);
  const isCurrent = expectedId === exerciseId;

  return {
    isCurrent,
    expectedName: isCurrent ? null : nameById(expectedId) ?? step.snapshot.name ?? `упражнение ${expectedId}`,
    expectedExerciseId: Number.isFinite(expectedId) ? expectedId : null,
    currentStepIndex: session.currentStepIndex,
    totalSteps: steps.length
  };
}

/** Active session only counts when it was started for the day on screen. */
export function sessionForViewedDay(
  session: WorkoutSession | null,
  dayId: string | undefined
): WorkoutSession | null {
  if (!session || !dayId) return null;
  const match = /^day-([^@]+)(?:@.*)?$/.exec(session.templateRevisionId);
  if (!match || match[1] !== dayId) return null;
  return session;
}
