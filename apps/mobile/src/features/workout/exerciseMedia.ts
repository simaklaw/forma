/**
 * Bundled exercise media (mp4 + optional jpg).
 *
 * Metro cannot resolve dynamic require() paths — every asset must appear
 * as a static require() call. Do not rewrite this to template strings.
 *
 * Physical files live under apps/mobile/assets/exercises/ (git symlinks to
 * apps/web/public/exercises/ so we do not duplicate binary blobs).
 */

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
  | 'side-plank';

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

/** Technique demo clips — all 12 home media keys. */
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
  'side-plank': require('../../../assets/exercises/side-plank.mp4')
};
