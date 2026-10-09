/**
 * Compatibility shim — metabolic math lives in @forma/core.
 * Existing imports (`@/engines/MetabolicEngine`) keep working.
 *
 * Do not `export * from '@forma/core'`: that barrel also exports the web-only
 * `useFormaStore`, which mobile must not import. Profile state is useFitPulseStore.
 */
export {
  calculateBMR,
  calculateBurnedCalories,
  calculatePresentationTargets,
  calculateTargets,
  calculateTDEE,
  detectWeightPlateau,
  estimateOneRepMax,
  isProtocolActive,
  MetabolicEngine,
  rpeFromRir,
  startDietBreak,
  startRefeed
} from '@forma/core';

export type {
  Biometrics,
  FitnessGoal,
  Goal,
  MetabolicGoal,
  MetabolicProtocolType,
  MetabolicStatus,
  Presentation,
  PresentationTargetInput,
  PresentationTargets,
  ProfileState,
  Sex,
  TargetPolicy,
  Targets
} from '@forma/core';
