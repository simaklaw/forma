import { catalogFor } from './catalog';
import { planForSex } from './sexPlan';

describe('sex-specific plans', () => {
  it('male and female home plans share frozen exercise ids but differ in day order', () => {
    const male = planForSex('home', 'male');
    const female = planForSex('home', 'female');
    expect(male[0]?.id).toBe('chest');
    expect(female[0]?.id).toBe('glutes');
    const maleIds = new Set(male.flatMap((d) => d.exercises.map((e) => e.id)));
    const femaleIds = new Set(female.flatMap((d) => d.exercises.map((e) => e.id)));
    expect(maleIds).toEqual(femaleIds);
  });

  it('female gym loads are lower than male for the same exercise id', () => {
    const male = catalogFor('gym', 'male');
    const female = catalogFor('gym', 'female');
    const mSquat = male.flatMap((d) => d.exercises).find((e) => e.id === 1);
    const fSquat = female.flatMap((d) => d.exercises).find((e) => e.id === 1);
    expect(mSquat).toBeDefined();
    expect(fSquat).toBeDefined();
    expect(fSquat!.workingWeight).toBeLessThan(mSquat!.workingWeight);
  });

  it('catalogFor falls back to male when sex is null', () => {
    expect(catalogFor('home', null)[0]?.id).toBe(catalogFor('home', 'male')[0]?.id);
  });
});
