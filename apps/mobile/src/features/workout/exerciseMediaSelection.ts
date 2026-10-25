import type { Sex } from '@/engines/MetabolicEngine';

export type ExerciseMediaKey =
  | 'pushup'
  | 'squat'
  | 'pullup'
  | 'lunge'
  | 'plank'
  | 'dead-bug'
  | 'chair-dip'
  | 'glute-bridge'
  | 'row-band'
  | 'hip-thrust'
  | 'shoulder-press'
  | 'side-plank'
  | 'stomach-vacuum';

export type SexSpecificExerciseMediaKey = 'pushup' | 'pullup';

export interface SexSpecificMediaVariant {
  key: SexSpecificExerciseMediaKey;
  sex: 'male' | 'female';
}

/**
 * Resolves only exercises that have dedicated FitPulse renders.
 * An unset profile keeps the app's established male fallback.
 */
export function selectSexSpecificVariant(
  key: ExerciseMediaKey,
  sex: Sex | null | undefined
): SexSpecificMediaVariant | null {
  if (key !== 'pushup' && key !== 'pullup') return null;

  return {
    key,
    sex: sex === 'female' ? 'female' : 'male'
  };
}
