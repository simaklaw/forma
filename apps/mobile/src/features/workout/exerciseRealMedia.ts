/**
 * issue #175: vetted real-technique GIFs for plan exercises.
 *
 * Pairs verified with GPT (product decision) + Grok (review): only dataset
 * clips whose sourceName matches the FitPulse exercise — technique and
 * equipment. Auto-matched pairs with matchScore < 0.75 are rejected (e.g.
 * squat -> "band squat", chair-dip -> "triceps dips floor"); those keys stay
 * on the stickman fallback instead of a misleading clip.
 */
import type { ExerciseMediaKey } from './exerciseMedia';
import { DATASET_GIF_MODULES, DATASET_THUMB_MODULES } from './exerciseDatasetAssets.generated';

export const REAL_GIF_BY_MEDIA_KEY: Partial<Record<ExerciseMediaKey, string>> = {
  pushup: 'lib-pushups',
  'dead-bug': 'lib-dead-bug',
  'glute-bridge': 'lib-butt-lift-bridge',
  'shoulder-press': 'lib-shoulder-press-with-bands'
};

/** Animated dataset GIF for the exact exercise, or undefined to use fallback. */
export function realGifForMediaKey(key: ExerciseMediaKey | undefined): number | undefined {
  const libId = key ? REAL_GIF_BY_MEDIA_KEY[key] : undefined;
  return libId != null ? DATASET_GIF_MODULES[libId] : undefined;
}

/** Static dataset thumb (poster frame) for list tiles, or undefined. */
export function realThumbForMediaKey(key: ExerciseMediaKey | undefined): number | undefined {
  const libId = key ? REAL_GIF_BY_MEDIA_KEY[key] : undefined;
  return libId != null ? DATASET_THUMB_MODULES[libId] : undefined;
}
