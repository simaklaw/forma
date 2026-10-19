jest.mock('./importedExerciseBridge', () => ({
  libIdForNumericId: (id: number) =>
    ({
      100029: 'lib-flat-bench-leg-pull-in',
      100120: 'lib-dumbbell-bicep-curl',
      100127: 'lib-front-squat-clean-grip',
      100139: 'lib-one-arm-kettlebell-row'
    } as Record<number, string>)[id] ?? null
}));

import { premiumMotionForExercise } from './exercisePremiumMapping';

describe('premiumMotionForExercise', () => {
  it('uses the reviewed home-plan pull-up ID and exact term', () => {
    expect(premiumMotionForExercise(11, 'Pull-ups')).toBe('pull-up');
    expect(premiumMotionForExercise(11, 'pull up')).toBe('pull-up');
  });

  it('maps only reviewed imported library IDs', () => {
    expect(premiumMotionForExercise(100029)).toBe('bench-leg-pull-in');
    expect(premiumMotionForExercise(100120)).toBe('bicep-curl');
    expect(premiumMotionForExercise(100127)).toBe('front-squat');
    expect(premiumMotionForExercise(100139)).toBe('one-arm-kettlebell-row');
  });

  it('rejects similar exercises and unknown IDs instead of guessing', () => {
    expect(premiumMotionForExercise(11, 'Inverted Rows')).toBeUndefined();
    expect(premiumMotionForExercise(11, 'Pull-Up To Side Plank')).toBeUndefined();
    expect(premiumMotionForExercise(41, 'Barbell Squat')).toBeUndefined();
    expect(premiumMotionForExercise(100128)).toBeUndefined();
    expect(premiumMotionForExercise(999999, 'Biceps Curl')).toBeUndefined();
  });
});
