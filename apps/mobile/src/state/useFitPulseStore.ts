/**
 * useFitPulseStore — React Native Zustand store for FitPulse.
 * Metabolic math lives in @forma/core; this file is persistence + UI state.
 *
 * Profile fields start as null until onboarding. Domain calculateTargets is only
 * called when isProfileComplete (App gate / screen guards).
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  MetabolicStatus,
  Targets,
  Goal,
  Sex,
  calculateTargets as calcTargets,
  detectWeightPlateau as detectPlateau,
  startRefeed,
  startDietBreak,
  type ProfileState
} from '@/engines/MetabolicEngine';
import { SetLogEntry, DayProgress, toDateKey, pruneOldSetLogs } from '@/engines/WorkoutStats';
import { uuidv7 } from '@/features/workout/data/ids';
import type { MuscleKey } from '@/components/MuscleMap';
import type { ImportedActivity } from '@forma/core';

export type { SetLogEntry, DayProgress } from '@/engines/WorkoutStats';

const SET_LOG_RETENTION_DAYS = 180;

export interface FoodItem {
  id: string;
  name: string;
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  loggedAt?: number;
}

/** User-defined product kept in local catalog (per 100g macros). */
export interface CustomFoodDef {
  id: string;
  name: string;
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
}

/** User-defined reusable meal — a saved bundle of food items logged together. */
export interface SavedMeal {
  id: string;
  name: string;
  items: Omit<FoodItem, 'id' | 'loggedAt'>[];
}

export interface DayMeals {
  breakfast: FoodItem[];
  lunch: FoodItem[];
  snack: FoodItem[];
  dinner: FoodItem[];
}

export type BodyMeasurementType = 'waist' | 'chest' | 'hips' | 'bicep' | 'thigh' | 'neck';

export const BODY_MEASUREMENT_LABELS: Record<BodyMeasurementType, string> = {
  waist: 'Талия',
  chest: 'Грудь',
  hips: 'Бёдра',
  bicep: 'Бицепс',
  thigh: 'Бедро (окружность)',
  neck: 'Шея'
};

export interface BodyMeasurementEntry {
  id: string;
  type: BodyMeasurementType;
  valueCm: number;
  dateKey: string; // toDateKey() format, same as setLogs/dayProgress
}

const BODY_MEASUREMENT_LIMIT = 200;

function isBodyMeasurementType(value: unknown): value is BodyMeasurementType {
  return (
    typeof value === 'string' &&
    Object.prototype.hasOwnProperty.call(BODY_MEASUREMENT_LABELS, value)
  );
}

function asBodyMeasurements(value: unknown): BodyMeasurementEntry[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out: BodyMeasurementEntry[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    if (typeof row.id !== 'string') continue;
    if (!isBodyMeasurementType(row.type)) continue;
    if (typeof row.valueCm !== 'number' || !Number.isFinite(row.valueCm)) continue;
    if (typeof row.dateKey !== 'string') continue;
    out.push({
      id: row.id,
      type: row.type,
      valueCm: row.valueCm,
      dateKey: row.dateKey
    });
  }
  return out;
}

function generateId(): string {
  return uuidv7();
}

function asPositiveNumber(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null;
  return value;
}

type StoredProfile = {
  sex: Sex | null;
  age: number | null;
  height: number | null;
  weight: number | null;
  pal: number;
  goal: Goal;
  focusAreas?: MuscleKey[];
};

function emptyProfile(): StoredProfile {
  return {
    sex: null,
    age: null,
    height: null,
    weight: null,
    pal: 1.375,
    goal: 'maintain',
    focusAreas: []
  };
}

function mergeProfile(current: StoredProfile, patch: Partial<StoredProfile>): StoredProfile {
  return { ...current, ...patch };
}

function scheduleWeightExport(weightKg: number): void {
  try {
    // Lazy require avoids circular deps in tests
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { HealthConnectService } = require('@/features/health/HealthConnectService');
    void HealthConnectService.writeWeightKg(weightKg);
  } catch {
    /* Jest / missing native */
  }
}

interface AppStore {
  profile: StoredProfile;
  metabolic: MetabolicStatus;
  todayMeals: DayMeals;
  customFoods: CustomFoodDef[];
  savedMeals: SavedMeal[];
  waterGlasses: number;
  weightHistory: number[];
  bodyMeasurements: BodyMeasurementEntry[];
  setLogs: SetLogEntry[];
  /** Activities imported from FIT/TCX/GPX (watch / GPS). */
  importedActivities: ImportedActivity[];
  dayProgress: DayProgress;
  personalRecords: Record<number, number>;
  updateProfile: (newProfile: Partial<StoredProfile>) => void;
  triggerRefeed: () => void;
  triggerDietBreak: () => void;
  addFoodItem: (mealType: keyof DayMeals, item: Omit<FoodItem, 'id'>) => void;
  removeFoodItem: (mealType: keyof DayMeals, id: string) => void;
  copyFoodItems: (mealType: keyof DayMeals, items: FoodItem[]) => void;
  addCustomFood: (item: Omit<CustomFoodDef, 'id'>) => CustomFoodDef;
  saveMealAsTemplate: (name: string, items: FoodItem[]) => SavedMeal;
  logSavedMeal: (mealType: keyof DayMeals, savedMealId: string) => void;
  deleteSavedMeal: (id: string) => void;
  setWater: (count: number) => void;
  logWeight: (weight: number) => void;
  logBodyMeasurement: (type: BodyMeasurementType, valueCm: number) => void;
  deleteBodyMeasurement: (id: string) => void;

  recordSet: (exerciseId: number, weight: number, reps: number, rir: number) => number;
  completedSetsToday: (exerciseId: number) => number;
  addImportedActivities: (items: ImportedActivity[]) => number;
  removeImportedActivity: (id: string) => void;

  calculateTargets: () => Targets;
  isPlateauSuspected: () => boolean;
  hydrate: (
    data: Partial<
      Pick<
        AppStore,
        | 'profile'
        | 'metabolic'
        | 'todayMeals'
        | 'customFoods'
        | 'savedMeals'
        | 'waterGlasses'
        | 'weightHistory'
        | 'bodyMeasurements'
        | 'setLogs'
        | 'importedActivities'
        | 'dayProgress'
        | 'personalRecords'
      >
    >
  ) => void;
}

function isDayMeals(value: unknown): value is DayMeals {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const keys: (keyof DayMeals)[] = ['breakfast', 'lunch', 'snack', 'dinner'];
  return keys.every((k) => Array.isArray((value as DayMeals)[k]));
}

/**
 * Defensive rehydrate merge for AsyncStorage snapshots.
 * Malformed shapes fall back to `current` defaults (same idea as customFoods guard).
 */
export function mergePersistedAppState(persisted: unknown, current: AppStore): AppStore {
  // Drop legacy coachMessages from older AsyncStorage snapshots (chat UI removed).
  const raw = (persisted ?? {}) as Record<string, unknown>;
  const { coachMessages: _legacyCoach, ...rest } = raw;
  const p = rest as Partial<AppStore>;
  return {
    ...current,
    ...p,
    profile: mergeProfile(current.profile, p.profile),
    customFoods: Array.isArray(p.customFoods) ? p.customFoods : current.customFoods,
    savedMeals: Array.isArray(p.savedMeals) ? p.savedMeals : current.savedMeals,
    setLogs: Array.isArray(p.setLogs) ? p.setLogs : current.setLogs,
    importedActivities: Array.isArray(p.importedActivities)
      ? p.importedActivities
      : current.importedActivities,
    weightHistory: Array.isArray(p.weightHistory) ? p.weightHistory : current.weightHistory,
    bodyMeasurements: asBodyMeasurements(p.bodyMeasurements) ?? current.bodyMeasurements,
    dayProgress:
      p.dayProgress != null && typeof p.dayProgress === 'object' && !Array.isArray(p.dayProgress)
        ? p.dayProgress
        : current.dayProgress,
    personalRecords:
      p.personalRecords != null &&
      typeof p.personalRecords === 'object' &&
      !Array.isArray(p.personalRecords)
        ? p.personalRecords
        : current.personalRecords,
    waterGlasses: typeof p.waterGlasses === 'number' ? p.waterGlasses : current.waterGlasses,
    metabolic:
      p.metabolic != null && typeof p.metabolic === 'object'
        ? { ...current.metabolic, ...p.metabolic }
        : current.metabolic,
    todayMeals: isDayMeals(p.todayMeals) ? p.todayMeals : current.todayMeals
  };
}

export const useFitPulseStore = create<AppStore>()(
  persist(
    (set, get) => ({
      profile: emptyProfile(),
      metabolic: { type: null, endsAt: null },
      todayMeals: { breakfast: [], lunch: [], snack: [], dinner: [] },
      customFoods: [],
      savedMeals: [],
      waterGlasses: 0,
      weightHistory: [],
      bodyMeasurements: [],
      setLogs: [],
      importedActivities: [],
      dayProgress: {},
      personalRecords: {},

      updateProfile: (newProfile) => {
        const prevWeight = get().profile.weight;
        set((state) => ({ profile: mergeProfile(state.profile, newProfile) }));
        if ('weight' in newProfile) {
          const next = asPositiveNumber(newProfile.weight);
          if (next != null && next !== prevWeight) {
            scheduleWeightExport(next);
          }
        }
      },

      triggerRefeed: () => set({ metabolic: startRefeed() }),
      triggerDietBreak: () => set({ metabolic: startDietBreak() }),

      addFoodItem: (mealType, item) =>
        set((state) => ({
          todayMeals: {
            ...state.todayMeals,
            [mealType]: [
              ...state.todayMeals[mealType],
              { ...item, id: generateId(), loggedAt: Date.now() }
            ]
          }
        })),

      removeFoodItem: (mealType, id) =>
        set((state) => ({
          todayMeals: {
            ...state.todayMeals,
            [mealType]: state.todayMeals[mealType].filter((i) => i.id !== id)
          }
        })),

      copyFoodItems: (mealType, items) =>
        set((state) => ({
          todayMeals: {
            ...state.todayMeals,
            [mealType]: [
              ...state.todayMeals[mealType],
              ...items.map((i) => ({
                ...i,
                id: generateId(),
                loggedAt: Date.now()
              }))
            ]
          }
        })),

      addCustomFood: (item) => {
        const created: CustomFoodDef = { ...item, id: generateId() };
        set((state) => ({ customFoods: [...state.customFoods, created] }));
        return created;
      },

      saveMealAsTemplate: (name, items) => {
        const created: SavedMeal = {
          id: generateId(),
          name,
          items: items.map(({ name: n, kcal, protein, fat, carbs }) => ({
            name: n,
            kcal,
            protein,
            fat,
            carbs
          }))
        };
        set((state) => ({ savedMeals: [...state.savedMeals, created] }));
        return created;
      },

      logSavedMeal: (mealType, savedMealId) => {
        const meal = get().savedMeals.find((m) => m.id === savedMealId);
        if (!meal) return;
        set((state) => ({
          todayMeals: {
            ...state.todayMeals,
            [mealType]: [
              ...state.todayMeals[mealType],
              ...meal.items.map((i) => ({
                ...i,
                id: generateId(),
                loggedAt: Date.now()
              }))
            ]
          }
        }));
      },

      deleteSavedMeal: (id) =>
        set((state) => ({ savedMeals: state.savedMeals.filter((m) => m.id !== id) })),

      setWater: (count) => set({ waterGlasses: Math.max(0, count) }),

      logWeight: (weight) => {
        if (!Number.isFinite(weight) || weight <= 0) return;
        set((state) => ({
          profile: { ...state.profile, weight },
          weightHistory: [...state.weightHistory, weight].slice(-90)
        }));
        scheduleWeightExport(weight);
      },

      logBodyMeasurement: (type, valueCm) => {
        if (!Number.isFinite(valueCm) || valueCm <= 0) return;
        const entry: BodyMeasurementEntry = {
          id: generateId(),
          type,
          valueCm,
          dateKey: toDateKey(new Date())
        };
        set((state) => ({
          bodyMeasurements: [...state.bodyMeasurements, entry].slice(-BODY_MEASUREMENT_LIMIT)
        }));
      },

      deleteBodyMeasurement: (id) =>
        set((state) => ({
          bodyMeasurements: state.bodyMeasurements.filter((e) => e.id !== id)
        })),

      recordSet: (exerciseId, weight, reps, rir) => {
        const todayKey = toDateKey(new Date());
        const entry: SetLogEntry = {
          id: generateId(),
          exerciseId,
          dateKey: todayKey,
          weight,
          reps,
          rir
        };
        const state = get();
        const todayForDay = state.dayProgress[todayKey] ?? {};
        const nextCount = (todayForDay[exerciseId] ?? 0) + 1;
        const prunedLogs = pruneOldSetLogs(state.setLogs, SET_LOG_RETENTION_DAYS);

        set({
          setLogs: [...prunedLogs, entry],
          dayProgress: {
            ...state.dayProgress,
            [todayKey]: { ...todayForDay, [exerciseId]: nextCount }
          },
          personalRecords: {
            ...state.personalRecords,
            [exerciseId]: Math.max(state.personalRecords[exerciseId] ?? 0, weight)
          }
        });

        return nextCount;
      },

      completedSetsToday: (exerciseId) => {
        const todayKey = toDateKey(new Date());
        return get().dayProgress[todayKey]?.[exerciseId] ?? 0;
      },

      addImportedActivities: (items) => {
        if (!items.length) return 0;
        const existing = new Set(get().importedActivities.map((a) => a.id));
        const fingerprints = new Set(
          get().importedActivities.map((a) => `${a.source}|${a.startedAtMs}|${a.durationSec}`)
        );
        const fresh = items.filter((a) => {
          if (existing.has(a.id)) return false;
          const fp = `${a.source}|${a.startedAtMs}|${a.durationSec}`;
          if (fingerprints.has(fp)) return false;
          fingerprints.add(fp);
          return true;
        });
        if (fresh.length) {
          set((state) => ({
            importedActivities: [...state.importedActivities, ...fresh].slice(-300)
          }));
        }
        return fresh.length;
      },

      removeImportedActivity: (id) =>
        set((state) => ({
          importedActivities: state.importedActivities.filter((a) => a.id !== id)
        })),

      calculateTargets: () => {
        const { profile, metabolic } = get();
        const domainProfile: ProfileState = {
          sex: profile.sex as Sex,
          age: profile.age as number,
          height: profile.height as number,
          weight: profile.weight as number,
          pal: profile.pal,
          goal: profile.goal
        };
        return calcTargets(domainProfile, metabolic);
      },

      isPlateauSuspected: () => {
        const { weightHistory, profile } = get();
        return detectPlateau(weightHistory, profile.goal);
      },

      hydrate: (data) => {
        set((state) => mergePersistedAppState(data, state));
      }
    }),
    {
      name: 'fitpulse_production_state',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      merge: (persisted, current) => mergePersistedAppState(persisted, current)
    }
  )
);

/** Meals logged today (by FoodItem.loggedAt). Items without loggedAt count as today. */
export function selectTodayMeals(meals: DayMeals, now: Date = new Date()): DayMeals {
  const todayKey = toDateKey(now);
  const filterToday = (items: FoodItem[]) =>
    items.filter((i) => !i.loggedAt || toDateKey(new Date(i.loggedAt)) === todayKey);
  return {
    breakfast: filterToday(meals.breakfast),
    lunch: filterToday(meals.lunch),
    snack: filterToday(meals.snack),
    dinner: filterToday(meals.dinner)
  };
}

/**
 * Food items logged yesterday for a given meal slot, for the "повторить
 * вчера" shortcut. Reads from the same loggedAt-derived history as
 * selectTodayMeals (todayMeals never resets by date).
 */
export function selectYesterdayMealItems(
  allMeals: DayMeals,
  mealType: keyof DayMeals,
  now: Date = new Date()
): FoodItem[] {
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = toDateKey(yesterday);
  return allMeals[mealType].filter(
    (i) => i.loggedAt && toDateKey(new Date(i.loggedAt)) === yesterdayKey
  );
}

export function selectDailyTotals(meals: DayMeals) {
  const all = [...meals.breakfast, ...meals.lunch, ...meals.snack, ...meals.dinner];
  return all.reduce(
    (acc, item) => ({
      kcal: acc.kcal + item.kcal,
      protein: acc.protein + item.protein,
      fat: acc.fat + item.fat,
      carbs: acc.carbs + item.carbs
    }),
    { kcal: 0, protein: 0, fat: 0, carbs: 0 }
  );
}
