/**
 * Unified Zustand store (report §5 step 3).
 * No persist here — web uses localStorage, mobile uses AsyncStorage in the app layer.
 */

import { create } from "zustand";
import { MetabolicEngine, type Biometrics } from "../engines/MetabolicEngine";
import { ACTIVITY_FACTOR } from "../engines/activity";
import type { UserContextSnapshot } from "../ai/ILocalAITrainer";

export interface FoodItem {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  loggedAt: number;
}

export interface WorkoutSession {
  id: string;
  exerciseId: string;
  durationMinutes: number;
  caloriesBurned: number;
  completedAt: string;
  name?: string;
  rpeScore?: number;
}

interface UnifiedFormaState {
  biometrics: Biometrics;
  foodLogs: FoodItem[];
  workoutLogs: WorkoutSession[];

  updateBiometrics: (newBio: Partial<Biometrics>) => void;
  addFoodLog: (food: Omit<FoodItem, "id" | "loggedAt">) => void;
  addWorkoutLog: (workout: Omit<WorkoutSession, "id" | "completedAt">) => void;

  getTDEE: () => number;
  getTodayConsumedCalories: () => number;
  getTodayBurnedCalories: () => number;
  getUserContextSnapshot: () => UserContextSnapshot;
}

function newId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function startOfLocalDay(now = Date.now()): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export const useFormaStore = create<UnifiedFormaState>((set, get) => ({
  biometrics: {
    weightKg: 70,
    heightCm: 175,
    age: 25,
    gender: "male",
    activityFactor: ACTIVITY_FACTOR.light,
  },
  foodLogs: [],
  workoutLogs: [],

  updateBiometrics: (newBio) =>
    set((state) => ({
      biometrics: { ...state.biometrics, ...newBio },
    })),

  addFoodLog: (food) =>
    set((state) => ({
      foodLogs: [
        ...state.foodLogs,
        { ...food, id: newId(), loggedAt: Date.now() },
      ],
    })),

  addWorkoutLog: (workout) =>
    set((state) => ({
      workoutLogs: [
        ...state.workoutLogs,
        {
          ...workout,
          id: newId(),
          completedAt: new Date().toISOString(),
        },
      ],
    })),

  getTDEE: () => MetabolicEngine.calculateTDEE(get().biometrics),

  getTodayConsumedCalories: () => {
    const start = startOfLocalDay();
    return get()
      .foodLogs.filter((item) => item.loggedAt >= start)
      .reduce((sum, item) => sum + item.calories, 0);
  },

  getTodayBurnedCalories: () => {
    const startIso = new Date(startOfLocalDay()).toISOString().slice(0, 10);
    return get()
      .workoutLogs.filter((item) => item.completedAt.startsWith(startIso))
      .reduce((sum, item) => sum + item.caloriesBurned, 0);
  },

  getUserContextSnapshot: () => {
    const s = get();
    const last = s.workoutLogs.at(-1);
    return {
      userProfile: {
        weightKg: s.biometrics.weightKg,
        heightCm: s.biometrics.heightCm,
        age: s.biometrics.age,
        gender: s.biometrics.gender,
      },
      dailyMetrics: {
        consumedCalories: s.getTodayConsumedCalories(),
        targetCalories: s.getTDEE(),
        burnedCalories: s.getTodayBurnedCalories(),
      },
      lastWorkout: last
        ? {
            name: last.name ?? last.exerciseId,
            completedAt: last.completedAt,
            rpeScore: last.rpeScore ?? 7,
          }
        : undefined,
    };
  },
}));
