/**
 * @forma/core — shared domain logic for Forma web + FitPulse mobile.
 * UI-agnostic: no React DOM, no React Native.
 */

export const FORMA_CORE_VERSION = "0.2.0";

export * from "./engines/MetabolicEngine";
export * from "./engines/WorkoutStats";
export * from "./met/exerciseMet";
export * from "./services/OpenFoodFactsService";
export * from "./services/WgerExerciseService";
