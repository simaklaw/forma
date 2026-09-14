import { calculateBurnedCalories, metForExercise, type UserContextSnapshot } from "@forma/core";
import { FOODS, planById, planExercises } from "./catalog";
import { dayMacros, todayKey } from "./forma";
import { useAppStore } from "./store";

export function webUserContextSnapshot(): UserContextSnapshot {
  const { profile, meals, workouts } = useAppStore.getState();
  const today = todayKey();
  const macros = dayMacros(
    meals.filter((m) => m.date === today),
    FOODS,
  );
  const last = [...workouts].reverse().find((w) => w.completed);
  const lastPlan = last ? planById(last.planId) : undefined;
  const todayWorkout = workouts.find((w) => w.date === today && w.completed);
  const todayPlan = todayWorkout ? planById(todayWorkout.planId) : undefined;
  let burned = 0;
  if (todayPlan) {
    burned = planExercises(todayPlan).reduce((sum, ex) => {
      const workSec = ex.unit === "sec" ? ex.reps * ex.sets : ex.reps * ex.sets * 3;
      return sum + calculateBurnedCalories(metForExercise(ex.id), profile.weightKg, workSec / 60);
    }, 0);
  }
  return {
    userProfile: {
      weightKg: profile.weightKg,
      heightCm: profile.heightCm,
      age: profile.age,
      gender: profile.presentation === "woman" ? "female" : "male",
    },
    dailyMetrics: {
      consumedCalories: macros.kcal,
      targetCalories: profile.calorieGoal,
      burnedCalories: burned,
    },
    lastWorkout: lastPlan
      ? { name: lastPlan.title, completedAt: last!.date, rpeScore: 7 }
      : undefined,
  };
}
