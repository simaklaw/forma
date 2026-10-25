import type { Sex } from '@/engines/MetabolicEngine';
import { selectSexSpecificVariant, type ExerciseMediaKey } from './exerciseMediaSelection';

/**
 * Bundled exercise media (mp4 + optional jpg).
 *
 * Metro cannot resolve dynamic require() paths — every asset must appear
 * as a static require() call. Do not rewrite this to template strings.
 *
 * Physical files live under apps/mobile/assets/exercises/ (git symlinks to
 * apps/web/public/exercises/ so we do not duplicate binary blobs).
 */

export type { ExerciseMediaKey } from './exerciseMediaSelection';
/** Static previews — all 12 keys have jpg next to the mp4 in web public. */
export const EXERCISE_THUMBNAILS: Partial<Record<ExerciseMediaKey, number>> = {
  pushup: require('../../../assets/exercises/pushup.jpg'),
  squat: require('../../../assets/exercises/squat.jpg'),
  pullup: require('../../../assets/exercises/pullup.jpg'),
  lunge: require('../../../assets/exercises/lunge.jpg'),
  plank: require('../../../assets/exercises/plank.jpg'),
  'dead-bug': require('../../../assets/exercises/dead-bug.jpg'),
  'chair-dip': require('../../../assets/exercises/chair-dip.jpg'),
  'glute-bridge': require('../../../assets/exercises/glute-bridge.jpg'),
  'row-band': require('../../../assets/exercises/row-band.jpg'),
  'hip-thrust': require('../../../assets/exercises/hip-thrust.jpg'),
  'shoulder-press': require('../../../assets/exercises/shoulder-press.jpg'),
  'side-plank': require('../../../assets/exercises/side-plank.jpg')
};

/** Technique demo clips — home plan keys + library bundled clips. */
export const EXERCISE_VIDEOS: Partial<Record<ExerciseMediaKey, number>> = {
  pushup: require('../../../assets/exercises/pushup.mp4'),
  squat: require('../../../assets/exercises/squat.mp4'),
  pullup: require('../../../assets/exercises/pullup.mp4'),
  lunge: require('../../../assets/exercises/lunge.mp4'),
  plank: require('../../../assets/exercises/plank.mp4'),
  'dead-bug': require('../../../assets/exercises/dead-bug.mp4'),
  'chair-dip': require('../../../assets/exercises/chair-dip.mp4'),
  'glute-bridge': require('../../../assets/exercises/glute-bridge.mp4'),
  'row-band': require('../../../assets/exercises/row-band.mp4'),
  'hip-thrust': require('../../../assets/exercises/hip-thrust.mp4'),
  'shoulder-press': require('../../../assets/exercises/shoulder-press.mp4'),
  'side-plank': require('../../../assets/exercises/side-plank.mp4'),
  'stomach-vacuum': require('../../../assets/exercises/stomach-vacuum.mp4')
};


/** Sex-specific FitPulse renders for exercises with newly validated 3D clips. */
const SEX_VARIANT_THUMBNAILS: Partial<Record<ExerciseMediaKey, Record<'male' | 'female', number>>> = {
  pushup: {
    male: require('../../../assets/exercises/fitpulse-pushup-male.jpg'),
    female: require('../../../assets/exercises/fitpulse-pushup-female.jpg')
  },
  pullup: {
    male: require('../../../assets/exercises/fitpulse-pullup-male.jpg'),
    female: require('../../../assets/exercises/fitpulse-pullup-female.jpg')
  }
};

const SEX_VARIANT_VIDEOS: Partial<Record<ExerciseMediaKey, Record<'male' | 'female', number>>> = {
  pushup: {
    male: require('../../../assets/exercises/fitpulse-pushup-male.mp4'),
    female: require('../../../assets/exercises/fitpulse-pushup-female.mp4')
  },
  pullup: {
    male: require('../../../assets/exercises/fitpulse-pullup-male.mp4'),
    female: require('../../../assets/exercises/fitpulse-pullup-female.mp4')
  }
};

/** Select a bundled poster for the active profile; retain existing media elsewhere. */
export function thumbnailForExercise(
  key: ExerciseMediaKey,
  sex: Sex | null | undefined
): number | undefined {
  const variant = selectSexSpecificVariant(key, sex);
  return (variant ? SEX_VARIANT_THUMBNAILS[variant.key]?.[variant.sex] : undefined) ??
    EXERCISE_THUMBNAILS[key];
}

/** Select a bundled loop for the active profile; retain existing media elsewhere. */
export function videoForExercise(
  key: ExerciseMediaKey,
  sex: Sex | null | undefined
): number | undefined {
  const variant = selectSexSpecificVariant(key, sex);
  return (variant ? SEX_VARIANT_VIDEOS[variant.key]?.[variant.sex] : undefined) ??
    EXERCISE_VIDEOS[key];
}
