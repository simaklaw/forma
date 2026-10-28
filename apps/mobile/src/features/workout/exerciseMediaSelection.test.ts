import { isCanonicalProfileAnimationExercise, resolveProfileExerciseMedia } from './exerciseMediaSelection';

const variants = {
  pullup: { male: 11, female: 12 },
  pushup: { male: 21, female: 22 }
};
const fallback = { pullup: 1, pushup: 2, squat: 3 };

describe('resolveProfileExerciseMedia', () => {
  it('selects the matching profile video or poster', () => {
    expect(resolveProfileExerciseMedia('pullup', 'male', variants, fallback)).toBe(11);
    expect(resolveProfileExerciseMedia('pullup', 'female', variants, fallback)).toBe(12);
    expect(resolveProfileExerciseMedia('pushup', 'female', variants, fallback)).toBe(22);
  });

  it('defaults an unset or unknown sex to male', () => {
    expect(resolveProfileExerciseMedia('pullup', null, variants, fallback)).toBe(11);
    expect(resolveProfileExerciseMedia('pullup', 'unknown', variants, fallback)).toBe(11);
    expect(resolveProfileExerciseMedia('squat', null, variants, fallback)).toBe(3);
  });

  it('preserves existing media for exercises without profile variants', () => {
    expect(resolveProfileExerciseMedia('squat', 'female', variants, fallback)).toBe(3);
    expect(resolveProfileExerciseMedia('unknown', 'female', variants, fallback)).toBeUndefined();
    expect(resolveProfileExerciseMedia(undefined, 'female', variants, fallback)).toBeUndefined();
  });
  it('uses generated FitPulse movies only for canonical base movements', () => {
    expect(isCanonicalProfileAnimationExercise(10, 'pushup')).toBe(true);
    expect(isCanonicalProfileAnimationExercise(59, 'pushup')).toBe(true);
    expect(isCanonicalProfileAnimationExercise(11, 'pullup')).toBe(true);
    expect(isCanonicalProfileAnimationExercise(48, 'pushup')).toBe(false);
    expect(isCanonicalProfileAnimationExercise(49, 'pushup')).toBe(false);
    expect(isCanonicalProfileAnimationExercise(50, 'pullup')).toBe(false);
  });

});
