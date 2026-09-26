import { mobileCoachSnapshot } from './coachSnapshot';
import type { ProfileState } from '@/engines/MetabolicEngine';
import type { DayMeals } from '@/state/useFitPulseStore';

const profile: ProfileState = {
  sex: 'male',
  age: 26,
  height: 178,
  weight: 76,
  pal: 1.375,
  goal: 'recomp'
};

const emptyMeals: DayMeals = {
  breakfast: [],
  lunch: [],
  snack: [],
  dinner: []
};

describe('mobileCoachSnapshot', () => {
  it('maps profile and target calories', () => {
    const snap = mobileCoachSnapshot({
      profile,
      todayMeals: emptyMeals,
      targetCalories: 2200
    });
    expect(snap.userProfile.weightKg).toBe(76);
    expect(snap.dailyMetrics.targetCalories).toBe(2200);
    expect(snap.dailyMetrics.consumedCalories).toBe(0);
    expect(snap.dailyMetrics.proteinConsumed).toBe(0);
    expect(snap.dailyMetrics.proteinTarget).toBe(152);
    expect(snap.lastWorkout).toBeUndefined();
  });

  it('sums meal kcal into consumedCalories', () => {
    const snap = mobileCoachSnapshot({
      profile,
      todayMeals: {
        ...emptyMeals,
        breakfast: [{ id: '1', name: 'Eggs', kcal: 300, protein: 20, fat: 20, carbs: 2 }]
      },
      targetCalories: 2200,
      lastWorkoutName: 'Ноги — сила',
      lastWorkoutDate: '2026-09-14'
    });
    expect(snap.dailyMetrics.consumedCalories).toBe(300);
    expect(snap.dailyMetrics.proteinConsumed).toBe(20);
    expect(snap.lastWorkout?.name).toBe('Ноги — сила');
  });
});
