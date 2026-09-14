/**
 * Thin bridge: web app consumes shared domain from @forma/core.
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
  OpenFoodFactsService,
  WgerExerciseService,
  CoachEngine,
  RulesCoach,
  type Biometrics,
  type ProfileState,
  type Targets,
  type MetabolicGoal,
  type Sex,
  type NormalizedFood,
  type WgerExercise,
  type WgerExerciseReference,
  type CoachContext,
  type CoachMessage,
  type CoachProvider,
} from "@forma/core";
