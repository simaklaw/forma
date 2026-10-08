/**
 * Bundled exercise media (mp4 + optional jpg).
 *
 * Metro cannot resolve dynamic require() paths — every asset must appear
 * as a static require() call. Do not rewrite this to template strings.
 *
 * Physical files live under apps/mobile/assets/exercises/ as real, committed
 * binary copies — NOT symlinks to apps/web/public/exercises/. Symlinks do
 * not reliably survive the Metro/Gradle asset-bundling pipeline into a
 * release APK (confirmed by on-device testing: all exercises fell back to
 * the step-cue placeholder despite correct require() wiring). The ~700 KB
 * of duplicated binary content across 12 files is a worthwhile trade for a
 * release build that actually works. If you ever need to re-sync these
 * files after a change in apps/web/public/exercises/, copy them again —
 * do not re-introduce a symlink.
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

export function mediaKeyForExerciseName(name: string): ExerciseMediaKey | null {
  const n = name.toLowerCase();
  if (n.includes('отжим') && n.includes('стул')) return 'chair-dip';
  if (n.includes('отжим')) return 'pushup';
  if (n.includes('присед')) return 'squat';
  if (n.includes('подтяг')) return 'pullup';
  if (n.includes('выпад')) return 'lunge';
  if (n.includes('боков') && n.includes('планк')) return 'side-plank';
  if (n.includes('планк')) return 'plank';
  if (n.includes('жук') || n.includes('dead')) return 'dead-bug';
  if (n.includes('мост')) return 'glute-bridge';
  if (n.includes('тяг') && n.includes('резин')) return 'row-band';
  if (n.includes('thrust') || n.includes('таз')) return 'hip-thrust';
  if (n.includes('жим') && n.includes('голов')) return 'shoulder-press';
  return null;
}
