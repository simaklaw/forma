/**
 * Metabolic Equivalent of Task (MET) for home / calisthenics movements.
 * Used with MetabolicEngine.calculateBurnedCalories.
 */

export const EXERCISE_MET = {
  squat: 5.0,
  pushup: 3.8,
  "glute-bridge": 2.8,
  plank: 3.0,
  "row-band": 3.5,
  lunge: 4.0,
  "shoulder-press": 3.5,
  "dead-bug": 2.5,
  pullup: 8.0,
  "chair-dip": 3.8,
  "side-plank": 2.5,
  "hip-thrust": 3.0,
} as const;

export type ExerciseMetId = keyof typeof EXERCISE_MET;

export function metForExercise(id: string, fallback = 3.5): number {
  if (id in EXERCISE_MET) return EXERCISE_MET[id as ExerciseMetId];
  return fallback;
}
