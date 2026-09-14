/**
 * Metabolic Equivalent of Task (MET) for home / gym movements.
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
  "bench-press": 6.0,
  deadlift: 6.0,
  "barbell-row": 5.5,
  "lat-pulldown": 4.5,
  curl: 3.5,
  "triceps-pushdown": 3.5,
} as const;

export type ExerciseMetId = keyof typeof EXERCISE_MET;

export function metForExercise(id: string, fallback = 3.5): number {
  if (id in EXERCISE_MET) return EXERCISE_MET[id as ExerciseMetId];
  const k = id.toLowerCase();
  if (k.includes("squat") || k.includes("присед")) return 6.0;
  if (k.includes("deadlift") || k.includes("станов")) return 6.0;
  if (k.includes("bench") || k.includes("жим")) return 6.0;
  if (k.includes("pullup") || k.includes("подтяг")) return 8.0;
  if (k.includes("row") || k.includes("тяг")) return 5.5;
  if (k.includes("lunge") || k.includes("выпад")) return 4.0;
  if (k.includes("plank") || k.includes("планка")) return 3.0;
  return fallback;
}
