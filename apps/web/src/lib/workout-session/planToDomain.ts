import type { SessionStepSnapshot } from "@forma/workout-domain";
import type { Exercise } from "../types";

export function catalogExercisesToSnapshots(exercises: Exercise[]): SessionStepSnapshot[] {
  return exercises.map((ex, i) => ({
    stepIndex: i,
    exerciseId: ex.id,
    exerciseRevisionId: `web-ex-${ex.id}-v1`,
    name: ex.name,
    targetSets: ex.sets,
    targetReps: ex.reps,
    targetWeightKg: 0,
    restSeconds: ex.restSec,
  }));
}

export function contentHashForCatalog(exercises: Exercise[]): string {
  const raw = exercises.map((e) => `${e.id}:${e.sets}x${e.reps}:${e.restSec}`).join("|");
  let h = 2166136261;
  for (let i = 0; i < raw.length; i++) {
    h ^= raw.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}
