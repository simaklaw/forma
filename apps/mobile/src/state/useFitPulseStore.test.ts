import { useFitPulseStore } from './useFitPulseStore';

const profile = {
  sex: 'male' as const, age: 28, height: 178, weight: 78, pal: 1.375, goal: 'recomp' as const
};

describe('profile numeric validation', () => {
  beforeEach(() => useFitPulseStore.setState({ profile: { ...profile } }));

  it.each([12, 121, 28.5, NaN, Infinity, -1, null])('preserves saved age for %s on update and import', (age) => {
    useFitPulseStore.getState().updateProfile({ age });
    expect(useFitPulseStore.getState().profile.age).toBe(28);
    useFitPulseStore.getState().hydrate({ profile: { ...profile, age } });
    expect(useFitPulseStore.getState().profile.age).toBe(28);
    expect(() => useFitPulseStore.getState().calculateTargets()).not.toThrow();
  });

  it.each([13, 120])('accepts age boundary %s', (age) => {
    useFitPulseStore.getState().updateProfile({ age });
    expect(useFitPulseStore.getState().profile.age).toBe(age);
  });

  it('keeps an empty age unset when invalid data is imported', () => {
    useFitPulseStore.setState({ profile: { ...profile, age: null } });
    useFitPulseStore.getState().hydrate({ profile: { ...profile, age: 12 } });
    expect(useFitPulseStore.getState().profile.age).toBeNull();
  });

  it.each([1.19, 1.726, NaN, Infinity, -1])('preserves saved PAL for %s on update and import', (pal) => {
    useFitPulseStore.getState().updateProfile({ pal });
    expect(useFitPulseStore.getState().profile.pal).toBe(profile.pal);
    useFitPulseStore.getState().hydrate({ profile: { ...profile, pal } });
    expect(useFitPulseStore.getState().profile.pal).toBe(profile.pal);
    expect(() => useFitPulseStore.getState().calculateTargets()).not.toThrow();
  });

  it.each([1.2, 1.725])('accepts PAL boundary %s', (pal) => {
    useFitPulseStore.getState().updateProfile({ pal });
    expect(useFitPulseStore.getState().profile.pal).toBe(pal);
  });
});
