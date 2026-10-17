// Asset modules are static require() of binaries (jpg/gif); the node jest
// environment cannot parse them, so stub both modules with the same id
// surface. The point of this suite is guarding the vetted key set and the
// fallback behaviour, not the asset files themselves.
jest.mock('./exerciseMedia', () => ({
  EXERCISE_THUMBNAILS: {
    pushup: 1,
    squat: 1,
    pullup: 1,
    lunge: 1,
    plank: 1,
    'dead-bug': 1,
    'chair-dip': 1,
    'glute-bridge': 1,
    'row-band': 1,
    'hip-thrust': 1,
    'shoulder-press': 1,
    'side-plank': 1
  }
}));

jest.mock('./exerciseDatasetAssets.generated', () => ({
  DATASET_GIF_MODULES: {
    'lib-pushups': 101,
    'lib-dead-bug': 102,
    'lib-butt-lift-bridge': 103,
    'lib-shoulder-press-with-bands': 104
  },
  DATASET_THUMB_MODULES: {
    'lib-pushups': 201,
    'lib-dead-bug': 202,
    'lib-butt-lift-bridge': 203,
    'lib-shoulder-press-with-bands': 204
  }
}));

import type { ExerciseMediaKey } from './exerciseMedia';
import { EXERCISE_THUMBNAILS } from './exerciseMedia';
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
