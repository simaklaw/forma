/**
 * Thin bridge: web app consumes shared domain math from @forma/core.
 */
export {
  MetabolicEngine,
  calculateBMR,
  calculateTDEE,
  calculateBurnedCalories,
  calculateTargets,
  toDateKey,
  todayKey,
  metForExercise,
  EXERCISE_MET,
  type Biometrics,
  type ProfileState,
  type Targets,
  type MetabolicGoal,
  type Sex,
} from "@forma/core";
