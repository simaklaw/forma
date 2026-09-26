/**
 * @forma/core — shared domain logic for Forma web + FitPulse mobile.
 * UI-agnostic: no React DOM, no React Native.
 */

export const FORMA_CORE_VERSION = "0.5.2";

export * from "./engines/MetabolicEngine.ts";
export * from "./engines/WorkoutStats.ts";
export * from "./engines/activity.ts";
export * from "./met/exerciseMet.ts";
export * from "./met/sessionBurn.ts";
export * from "./services/OpenFoodFactsService.ts";
export * from "./services/WgerExerciseService.ts";
export * from "./ai/CoachEngine.ts";
export * from "./state/useFormaStore.ts";
export * from "./profile/isProfileComplete.ts";
