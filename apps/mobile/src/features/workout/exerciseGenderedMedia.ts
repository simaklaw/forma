import type { ExerciseMediaKey } from './exerciseMedia';

export type ExercisePresentationSex = 'male' | 'female';

/**
 * Stable, public animation assets published by the FitPulse animation-studio
 * workflow after a successful main-branch render and manual/CI QA.
 *
 * The existing video remains the fallback for every unmapped exercise. The
 * gendered URL is only selected for exercises with a published exact variant.
 */
const GENDERED_VIDEO_URLS: Partial<
  Record<ExerciseMediaKey, Partial<Record<ExercisePresentationSex, string>>>
> = {
  pullup: {
    male: 'https://raw.githubusercontent.com/simaklaw/fitpulse-godot-animation-studio/main/assets/fitpulse/pull-up/male/pull_up.mp4',
    female: 'https://raw.githubusercontent.com/simaklaw/fitpulse-godot-animation-studio/main/assets/fitpulse/pull-up/female/pull_up.mp4'
  }
};

export function genderedVideoUrlForMediaKey(
  mediaKey: ExerciseMediaKey | undefined,
  sex: ExercisePresentationSex | null | undefined
): string | undefined {
  if (!mediaKey || (sex !== 'male' && sex !== 'female')) return undefined;
  return GENDERED_VIDEO_URLS[mediaKey]?.[sex];
}

export function hasGenderedVideoForMediaKey(
  mediaKey: ExerciseMediaKey | undefined,
  sex: ExercisePresentationSex | null | undefined
): boolean {
  return genderedVideoUrlForMediaKey(mediaKey, sex) != null;
}
