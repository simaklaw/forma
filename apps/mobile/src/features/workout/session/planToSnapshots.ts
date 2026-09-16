import type { SessionStepSnapshot } from '@forma/workout-domain';
import type { ExerciseDef } from '../ExerciseSheet';

/** Map UI exercise defs to immutable session step snapshots (content identity for this start). */
export function exercisesToSnapshots(exercises: ExerciseDef[]): SessionStepSnapshot[] {
  return exercises.map((ex, i) => ({
    stepIndex: i,
    exerciseId: String(ex.id),
    exerciseRevisionId: `local-ex-${ex.id}-v1`,
    name: ex.name,
    targetSets: ex.totalSets,
    targetReps: ex.workingReps,
    targetWeightKg: ex.workingWeight,
    restSeconds: ex.restSeconds
  }));
}

export function contentHashForExercises(exercises: ExerciseDef[]): string {
  const raw = exercises
    .map((e) => `${e.id}:${e.totalSets}x${e.workingReps}@${e.workingWeight}:${e.restSeconds}`)
    .join('|');
  let h = 2166136261;
  for (let i = 0; i < raw.length; i++) {
    h ^= raw.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}
