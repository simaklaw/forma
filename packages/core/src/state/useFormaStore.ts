/**
 * Unified Zustand store (report §5 step 3).
 * Persist is opt-in via createPersistedFormaStore (web: localStorage, mobile: AsyncStorage).
 */

import { create } from "zustand";
import { persist, createJSONStorage, type StateStorage } from "zustand/middleware";
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

export interface UnifiedFormaState {
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

function assertFiniteNonNegative(value: number, name: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} must be a finite number >= 0`);
  }
}

function assertValidWorkoutDate(value: string): void {
  if (!Number.isFinite(Date.parse(value))) {
    throw new RangeError("completedAt must be a valid ISO date");
  }
}

const initialBiometrics: Biometrics = {
  weightKg: 70,
  heightCm: 175,
  age: 25,
  gender: "male",
  activityFactor: ACTIVITY_FACTOR.light,
};

export function createFormaSlice(
  set: (fn: (state: UnifiedFormaState) => Partial<UnifiedFormaState> | UnifiedFormaState) => void,
  get: () => UnifiedFormaState,
): UnifiedFormaState {
  return {
    biometrics: initialBiometrics,
    foodLogs: [],
    workoutLogs: [],

    updateBiometrics: (newBio) =>
      set((state) => {
        const next = { ...state.biometrics, ...newBio };
        // Reuse the engine's domain validation instead of allowing invalid state to persist.
        MetabolicEngine.calculateBMR(next);
        MetabolicEngine.calculateTDEE(next);
        return { biometrics: next };
      }),

    addFoodLog: (food) => {
      assertFiniteNonNegative(food.calories, "calories");
      assertFiniteNonNegative(food.protein, "protein");
      assertFiniteNonNegative(food.carbs, "carbs");
      assertFiniteNonNegative(food.fat, "fat");
      if (!food.name.trim()) throw new RangeError("name must not be empty");
      set((state) => ({
        foodLogs: [...state.foodLogs, { ...food, id: newId(), loggedAt: Date.now() }],
      }));
    },

    addWorkoutLog: (workout) => {
      assertFiniteNonNegative(workout.durationMinutes, "durationMinutes");
      assertFiniteNonNegative(workout.caloriesBurned, "caloriesBurned");
      if (workout.rpeScore !== undefined && (!Number.isFinite(workout.rpeScore) || workout.rpeScore < 0 || workout.rpeScore > 10)) {
        throw new RangeError("rpeScore must be between 0 and 10");
      }
      if (!workout.exerciseId.trim()) throw new RangeError("exerciseId must not be empty");
      set((state) => ({
        workoutLogs: [
          ...state.workoutLogs,
          { ...workout, id: newId(), completedAt: new Date().toISOString() },
        ],
      }));
    },

    getTDEE: () => MetabolicEngine.calculateTDEE(get().biometrics),

    getTodayConsumedCalories: () => {
      const start = startOfLocalDay();
      return get()
        .foodLogs.filter((item) => item.loggedAt >= start)
        .reduce((sum, item) => sum + item.calories, 0);
    },

    getTodayBurnedCalories: () => {
      const start = startOfLocalDay();
      return get()
        .workoutLogs.filter((item) => Date.parse(item.completedAt) >= start)
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
  };
}

export const useFormaStore = create<UnifiedFormaState>((set, get) => createFormaSlice(set, get));

/** Platform persist: pass localStorage or AsyncStorage wrapper. */
export function createPersistedFormaStore(storage: StateStorage, name = "forma-core") {
  return create<UnifiedFormaState>()(
    persist((set, get) => createFormaSlice(set, get), {
      name,
      storage: createJSONStorage(() => storage),
      partialize: (s) => ({
        biometrics: s.biometrics,
        foodLogs: s.foodLogs,
        workoutLogs: s.workoutLogs,
      }),
    }),
  );
}
