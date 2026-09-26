import type { SessionStepSnapshot } from '@forma/workout-domain';
import type { ExerciseDef } from '../ExerciseSheet';
import { resolveWorkingLoadKg } from '../catalog';

/**
 * Bump when default gym/home day plans change structure or exercise targets.
 * Included in templateRevisionId and exerciseRevisionId so old sessions stay isolated.
 */
export const PLAN_REVISION = '2026-09-26.1';

/** Map UI exercise defs to immutable session step snapshots (content identity for this start). */
export function exercisesToSnapshots(
  exercises: ExerciseDef[],
  bodyWeightKg = 0
): SessionStepSnapshot[] {
  return exercises.map((ex, i) => ({
    stepIndex: i,
    exerciseId: String(ex.id),
    exerciseRevisionId: `local-ex-${ex.id}-${PLAN_REVISION}`,
    name: ex.name,
    targetSets: ex.totalSets,
    targetReps: ex.workingReps,
    targetWeightKg: resolveWorkingLoadKg(ex, bodyWeightKg),
    restSeconds: ex.restSeconds
  }));
}

export function contentHashForExercises(exercises: ExerciseDef[], bodyWeightKg = 0): string {
  const raw = exercises
    .map(
      (e) =>
        `${e.id}:${e.totalSets}x${e.workingReps}@${resolveWorkingLoadKg(e, bodyWeightKg)}:${e.restSeconds}`
    )
    .join('|');
  let h = 2166136261;
  for (let i = 0; i < raw.length; i++) {
    h ^= raw.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `${PLAN_REVISION}:${(h >>> 0).toString(16)}`;
}
