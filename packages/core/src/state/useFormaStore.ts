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
  getUserContextSnapshot: (targetCalories?: number) => UserContextSnapshot;
}

export const FORMA_PERSIST_VERSION = 1;

interface PersistedFormaState {
  biometrics?: unknown;
  foodLogs?: unknown;
  workoutLogs?: unknown;
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

function assertOptionalTargetCalories(value: number | undefined): void {
  if (value !== undefined && (!Number.isFinite(value) || value < 0)) {
    throw new RangeError("targetCalories must be a finite number >= 0");
  }
}

const initialBiometrics: Biometrics = {
  weightKg: 70,
  heightCm: 175,
  age: 25,
  gender: "male",
  activityFactor: ACTIVITY_FACTOR.light,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNonNegative(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isValidBiometrics(value: unknown): value is Biometrics {
  if (!isRecord(value)) return false;

  const gender = value.gender;
  const activityFactor = value.activityFactor;
  if (
    !isFiniteNonNegative(value.weightKg) ||
    !isFiniteNonNegative(value.heightCm) ||
    !isFiniteNonNegative(value.age) ||
    (gender !== "male" && gender !== "female") ||
    !isFiniteNonNegative(activityFactor)
  ) {
    return false;
  }

  const biometrics: Biometrics = {
    weightKg: value.weightKg,
    heightCm: value.heightCm,
    age: value.age,
    gender,
    activityFactor,
  };

  try {
    // MetabolicEngine remains the source of truth for domain constraints
    // such as supported age, height, weight, and activity-factor ranges.
    MetabolicEngine.calculateBMR(biometrics);
    MetabolicEngine.calculateTDEE(biometrics);
    return true;
  } catch {
    return false;
  }
}

function sanitizeFoodLogs(value: unknown): FoodItem[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is FoodItem =>
      isRecord(item) &&
      typeof item.id === "string" &&
      typeof item.name === "string" &&
      item.name.trim().length > 0 &&
      isFiniteNonNegative(item.calories) &&
      isFiniteNonNegative(item.protein) &&
      isFiniteNonNegative(item.carbs) &&
      isFiniteNonNegative(item.fat) &&
      typeof item.loggedAt === "number" &&
      Number.isFinite(item.loggedAt),
  );
}

function sanitizeWorkoutLogs(value: unknown): WorkoutSession[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is WorkoutSession =>
      isRecord(item) &&
      typeof item.id === "string" &&
      typeof item.exerciseId === "string" &&
      item.exerciseId.trim().length > 0 &&
      isFiniteNonNegative(item.durationMinutes) &&
      isFiniteNonNegative(item.caloriesBurned) &&
      typeof item.completedAt === "string" &&
      Number.isFinite(Date.parse(item.completedAt)) &&
      (item.name === undefined || typeof item.name === "string") &&
      (item.rpeScore === undefined || (typeof item.rpeScore === "number" && Number.isFinite(item.rpeScore) && item.rpeScore >= 0 && item.rpeScore <= 10)),
  );
}

export function sanitizePersistedFormaState(value: unknown): Pick<UnifiedFormaState, "biometrics" | "foodLogs" | "workoutLogs"> {
  const persisted = isRecord(value) ? (value as PersistedFormaState) : {};
  return {
    biometrics: isValidBiometrics(persisted.biometrics) ? persisted.biometrics : initialBiometrics,
    foodLogs: sanitizeFoodLogs(persisted.foodLogs),
    workoutLogs: sanitizeWorkoutLogs(persisted.workoutLogs),
  };
}

export function migrateFormaState(
  persistedState: unknown,
  version: number,
): Pick<UnifiedFormaState, "biometrics" | "foodLogs" | "workoutLogs"> {
  // Version 0 was the unversioned persist format. It already used the same
  // three data fields, so migration is normalization rather than reshaping.
  if (version <= 0) return sanitizePersistedFormaState(persistedState);
  if (version === FORMA_PERSIST_VERSION) return sanitizePersistedFormaState(persistedState);
  throw new Error(`Unsupported Forma persistence version: ${version}`);
}

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

    getUserContextSnapshot: (targetCalories) => {
      assertOptionalTargetCalories(targetCalories);
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
          targetCalories: targetCalories ?? s.getTDEE(),
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
      version: FORMA_PERSIST_VERSION,
      storage: createJSONStorage(() => storage),
      migrate: (persistedState, version) => migrateFormaState(persistedState, version),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...sanitizePersistedFormaState(persistedState),
      }),
      partialize: (s) => ({
        biometrics: s.biometrics,
        foodLogs: s.foodLogs,
        workoutLogs: s.workoutLogs,
      }),
    }),
  );
}
