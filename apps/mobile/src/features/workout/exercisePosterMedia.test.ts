jest.mock('./exerciseMedia', () => ({
  EXERCISE_THUMBNAILS: { squat: 11, pushup: 12 }
}));
jest.mock('./exerciseRealMedia', () => ({
  realThumbForMediaKey: (key: string | undefined) => (key === 'dead-bug' ? 13 : undefined)
}));
jest.mock('./importedExerciseImages.generated', () => ({
  IMPORTED_EXERCISE_IMAGES: {
    'air-bike-0': 21,
    'romanian-deadlift-0': 22
  }
}));
jest.mock('./importedExerciseBridge', () => ({
  IMPORTED_NUMERIC_ID_BASE: 100_000,
  libIdForNumericId: (id: number) => (id === 100_001 ? 'lib-air-bike' : null)
}));

import { exercisePosterAsset } from './exercisePosterMedia';

describe('exercisePosterAsset', () => {
  it('uses the exact poster for a stable imported-library ID first', () => {
    expect(exercisePosterAsset(100_001, 'squat', 'Romanian Deadlift')).toBe(21);
  });

  it('uses a bundled poster for a known plan media key', () => {
    expect(exercisePosterAsset(13, 'squat', 'Squat')).toBe(11);
  });

  it('uses an exact slug match when no media key is provided', () => {
    expect(exercisePosterAsset(27, undefined, 'Romanian Deadlift')).toBe(22);
  });

  it('does not reuse a generic push-up poster for close-grip or decline variants', () => {
    expect(exercisePosterAsset(48, 'pushup', 'Close-grip Press-ups')).toBeUndefined();
    expect(exercisePosterAsset(49, 'pushup', 'Decline Push-Ups')).toBeUndefined();
  });

  it('does not fuzzy-match a related exercise', () => {
    expect(exercisePosterAsset(27, undefined, 'Romanian Deadlifts')).toBeUndefined();
    expect(exercisePosterAsset(27, undefined, undefined)).toBeUndefined();
  });
});
