import type { WorkoutSession } from '@forma/workout-domain';

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

  const step = session.steps[session.currentStepIndex];
  if (!step) {
    return {
      isCurrent: false,
      expectedName: null,
      expectedExerciseId: null,
      currentStepIndex: session.currentStepIndex,
      totalSteps: session.steps.length
    };
  }

  const expectedId = Number(step.snapshot.exerciseId);
  const isCurrent = expectedId === exerciseId;

  return {
    isCurrent,
    expectedName: isCurrent ? null : nameById(expectedId) ?? step.snapshot.name ?? `упражнение ${expectedId}`,
    expectedExerciseId: Number.isFinite(expectedId) ? expectedId : null,
    currentStepIndex: session.currentStepIndex,
    totalSteps: session.steps.length
  };
}
