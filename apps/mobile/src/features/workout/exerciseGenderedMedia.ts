import type { ExerciseMediaKey } from './exerciseMedia';

export type ExercisePresentationSex = 'male' | 'female';

/** Bump when the published MP4/poster files change so stale cached clips are ignored. */
export const GENDERED_MEDIA_REVISION = 'pull-up-prototype-v1';

/**
 * Stable, public animation assets published by the FitPulse animation-studio
 * workflow after a successful main-branch render and manual/CI QA.
 *
 * The existing video remains the fallback for every unmapped exercise. The
 * gendered URL is only selected for exercises with a published exact variant.
 */
interface GenderedExerciseMediaUrls {
  video: string;
  poster: string;
}

const GENDERED_MEDIA_URLS: Partial<
  Record<ExerciseMediaKey, Partial<Record<ExercisePresentationSex, GenderedExerciseMediaUrls>>>
> = {
  pullup: {
    male: {
      video: 'https://raw.githubusercontent.com/simaklaw/fitpulse-godot-animation-studio/main/assets/fitpulse/pull-up/male/pull_up.mp4',
      poster: 'https://raw.githubusercontent.com/simaklaw/fitpulse-godot-animation-studio/main/assets/fitpulse/pull-up/male/poster.png'
    },
    female: {
      video: 'https://raw.githubusercontent.com/simaklaw/fitpulse-godot-animation-studio/main/assets/fitpulse/pull-up/female/pull_up.mp4',
      poster: 'https://raw.githubusercontent.com/simaklaw/fitpulse-godot-animation-studio/main/assets/fitpulse/pull-up/female/poster.png'
    }
  }
};

function genderedMediaFor(
  mediaKey: ExerciseMediaKey | undefined,
  sex: ExercisePresentationSex | null | undefined
): GenderedExerciseMediaUrls | undefined {
  if (!mediaKey || (sex !== 'male' && sex !== 'female')) return undefined;
  return GENDERED_MEDIA_URLS[mediaKey]?.[sex];
}

export function genderedVideoUrlForMediaKey(
  mediaKey: ExerciseMediaKey | undefined,
  sex: ExercisePresentationSex | null | undefined
): string | undefined {
  return genderedMediaFor(mediaKey, sex)?.video;
}

export function genderedPosterUrlForMediaKey(
  mediaKey: ExerciseMediaKey | undefined,
  sex: ExercisePresentationSex | null | undefined
): string | undefined {
  return genderedMediaFor(mediaKey, sex)?.poster;
}

export function hasGenderedVideoForMediaKey(
  mediaKey: ExerciseMediaKey | undefined,
  sex: ExercisePresentationSex | null | undefined
): boolean {
  return genderedVideoUrlForMediaKey(mediaKey, sex) != null;
}
