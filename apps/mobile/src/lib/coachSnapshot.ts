import type { UserContextSnapshot } from '@forma/core';
import type { ProfileState } from '@/engines/MetabolicEngine';
import { selectDailyTotals, type DayMeals } from '@/state/useFitPulseStore';

/** Build ILocalAITrainer context from FitPulse store slices. */
export function mobileCoachSnapshot(args: {
  profile: ProfileState;
  todayMeals: DayMeals;
  targetCalories: number;
  proteinTarget?: number;
  burnedCalories?: number;
  lastWorkoutName?: string;
  lastWorkoutDate?: string;
  rpeScore?: number;
}): UserContextSnapshot {
  const totals = selectDailyTotals(args.todayMeals);
  const proteinTarget =
    args.proteinTarget ?? Math.round(args.profile.weight * 2);
  return {
    userProfile: {
      weightKg: args.profile.weight,
      heightCm: args.profile.height,
      age: args.profile.age,
      gender: args.profile.sex === 'female' ? 'female' : 'male'
    },
    dailyMetrics: {
      consumedCalories: totals.kcal,
      targetCalories: args.targetCalories,
      burnedCalories: args.burnedCalories ?? 0,
      proteinConsumed: Math.round(totals.protein),
      proteinTarget
    },
    lastWorkout: args.lastWorkoutName
      ? {
          name: args.lastWorkoutName,
          completedAt: args.lastWorkoutDate ?? new Date().toISOString().slice(0, 10),
          rpeScore: args.rpeScore ?? 7
        }
      : undefined
  };
}
