import { genderedPosterUrlForMediaKey, genderedVideoUrlForMediaKey, hasGenderedVideoForMediaKey } from './exerciseGenderedMedia';

describe('exerciseGenderedMedia', () => {
  it('provides a distinct pull-up URL for each configured presentation', () => {
    const male = genderedVideoUrlForMediaKey('pullup', 'male');
    const female = genderedVideoUrlForMediaKey('pullup', 'female');

    expect(male).toContain('/assets/fitpulse/pull-up/male/pull_up.mp4');
    expect(female).toContain('/assets/fitpulse/pull-up/female/pull_up.mp4');
    expect(genderedPosterUrlForMediaKey('pullup', 'male')).toContain('/male/poster.png');
    expect(genderedPosterUrlForMediaKey('pullup', 'female')).toContain('/female/poster.png');
    expect(male).not.toBe(female);
  });

  it('does not guess a variant for an unmapped exercise or unknown profile', () => {
    expect(genderedVideoUrlForMediaKey('squat', 'male')).toBeUndefined();
    expect(genderedVideoUrlForMediaKey('pullup', null)).toBeUndefined();
    expect(genderedPosterUrlForMediaKey('pullup', null)).toBeUndefined();
    expect(genderedVideoUrlForMediaKey(undefined, 'female')).toBeUndefined();
    expect(hasGenderedVideoForMediaKey('squat', 'female')).toBe(false);
  });

  it('marks only published exercise/profile pairs as gender-specific', () => {
    expect(hasGenderedVideoForMediaKey('pullup', 'male')).toBe(true);
    expect(hasGenderedVideoForMediaKey('pullup', 'female')).toBe(true);
    expect(hasGenderedVideoForMediaKey('pullup', null)).toBe(false);
  });
});
