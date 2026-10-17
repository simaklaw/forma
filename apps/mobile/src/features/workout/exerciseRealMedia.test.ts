import { EXERCISE_THUMBNAILS, type ExerciseMediaKey } from './exerciseMedia';
import {
  REAL_GIF_BY_MEDIA_KEY,
  realGifForMediaKey,
  realThumbForMediaKey
} from './exerciseRealMedia';

describe('exerciseRealMedia', () => {
  it('map keys are known ExerciseMediaKey entries', () => {
    for (const key of Object.keys(REAL_GIF_BY_MEDIA_KEY) as ExerciseMediaKey[]) {
      expect(EXERCISE_THUMBNAILS[key]).toBeDefined();
    }
  });

  it('every mapped pair resolves to local gif and thumb asset numbers', () => {
    for (const key of Object.keys(REAL_GIF_BY_MEDIA_KEY) as ExerciseMediaKey[]) {
      expect(typeof realGifForMediaKey(key)).toBe('number');
      expect(typeof realThumbForMediaKey(key)).toBe('number');
    }
  });

  it('rejected and unmapped keys stay on the stickman fallback', () => {
    const rejected: (ExerciseMediaKey | undefined)[] = [
      'squat',
      'side-plank',
      'chair-dip',
      'lunge',
      'pullup',
      'plank',
      'row-band',
      'hip-thrust',
      'stomach-vacuum',
      undefined
    ];
    for (const key of rejected) {
      expect(realGifForMediaKey(key)).toBeUndefined();
      expect(realThumbForMediaKey(key)).toBeUndefined();
    }
  });
});
