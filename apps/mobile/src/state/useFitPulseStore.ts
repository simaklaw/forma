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
import { MUSCLE_LABELS, type MuscleKey } from '@/domain/muscleKeys';
import type { ImportedActivity } from '@forma/core';
import {
  LoggedFoodSummary,
  FAVORITE_FOODS_LIMIT,
  upsertRecentFood,
  toggleFavoriteFood as toggleFavoriteFoodEntry
} from '@/features/nutrition/recentFoods';

export type { SetLogEntry, DayProgress } from '@/engines/WorkoutStats';

const SET_LOG_RETENTION_DAYS = 180;

export interface FoodItem {
  id: string;
  name: string;
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  /** Микронутриенты порции (масштабированы от 100 г; есть не у всех позиций). */
  fiber?: number;
  sugars?: number;
  saturatedFat?: number;
  sodiumMg?: number;
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
  /** Штрихкод, по которому сканер мгновенно находит этот продукт (EAN/UPC). */
  barcode?: string;
}

/** User-defined reusable meal — a saved bundle of food items logged together. */
export interface SavedMeal {
  id: string;
  name: string;
  items: Omit<FoodItem, 'id' | 'loggedAt'>[];
  /** Штрихкод: сканируем упаковку — логается всё блюдо целиком. */
  barcode?: string;
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

function isDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
  );
}

/** Valid list, empty list, or undefined when the payload is malformed. */
function asBodyMeasurements(value: unknown): BodyMeasurementEntry[] | undefined {
  if (!Array.isArray(value)) return undefined;
  if (value.length === 0) return [];
  const out: BodyMeasurementEntry[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (!item || typeof item !== 'object') return undefined;
    const row = item as Record<string, unknown>;
    if (typeof row.id !== 'string' || row.id.length === 0) return undefined;
    if (!isBodyMeasurementType(row.type)) return undefined;
    if (typeof row.valueCm !== 'number' || !Number.isFinite(row.valueCm) || row.valueCm <= 0) {
      return undefined;
    }
    if (typeof row.dateKey !== 'string' || !isDateKey(row.dateKey)) return undefined;
    if (seen.has(row.id)) return undefined;
    seen.add(row.id);
    out.push({
      id: row.id,
      type: row.type,
      valueCm: row.valueCm,
      dateKey: row.dateKey
    });
  }
  return out.slice(-BODY_MEASUREMENT_LIMIT);
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

function asFocusAreas(value: unknown): MuscleKey[] {
  if (!Array.isArray(value)) return [];
  const allowed = MUSCLE_LABELS as Record<string, string>;
  const out: MuscleKey[] = [];
  for (const item of value) {
    if (typeof item === 'string' && item in allowed && !out.includes(item as MuscleKey)) {
      out.push(item as MuscleKey);
    }
  }
  return out;
}

function mergeProfile(current: StoredProfile, patch: Partial<StoredProfile>): StoredProfile {
  const next = { ...current, ...patch };
  if ('focusAreas' in patch) {
    next.focusAreas = asFocusAreas(patch.focusAreas);
  } else if (!Array.isArray(next.focusAreas)) {
    next.focusAreas = [];
  }
  return next;
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

  try {
    // iOS counterpart — Apple HealthKit weight export.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { HealthKitService } = require('@/features/health/HealthKitService');
    void HealthKitService.writeWeightKg(weightKg);
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
  /** Недавно залогированные продукты (one-tap re-log, дедуп по имени). */
  recentFoods: LoggedFoodSummary[];
  /** Продукты, добавленные пользователем в избранное (★). */
  favoriteFoods: LoggedFoodSummary[];
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
  saveMealAsTemplate: (name: string, items: FoodItem[], barcode?: string) => SavedMeal;
  logSavedMeal: (mealType: keyof DayMeals, savedMealId: string) => void;
  deleteSavedMeal: (id: string) => void;
  toggleFavoriteFood: (food: LoggedFoodSummary) => boolean;
  setWater: (count: number) => void;
  logWeight: (weight: number) => void;
  logBodyMeasurement: (type: BodyMeasurementType, valueCm: number) => void;
  deleteBodyMeasurement: (id: string) => void;

  recordSet: (exerciseId: number, weight: number, reps: number, rir: number) => number;
  completedSetsToday: (exerciseId: number) => number;
  importSetLogs: (
    entries: Array<Omit<SetLogEntry, 'id' | 'imported'>>
  ) => { added: number; skippedDuplicates: number };
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
        | 'recentFoods'
        | 'favoriteFoods'
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
    profile: mergeProfile(current.profile, p.profile ?? {}),
    customFoods: Array.isArray(p.customFoods) ? p.customFoods : current.customFoods,
    savedMeals: Array.isArray(p.savedMeals) ? p.savedMeals : current.savedMeals,
    recentFoods: Array.isArray(p.recentFoods) ? p.recentFoods : current.recentFoods,
    favoriteFoods: Array.isArray(p.favoriteFoods) ? p.favoriteFoods : current.favoriteFoods,
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
      recentFoods: [],
      favoriteFoods: [],
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
          },
          recentFoods: upsertRecentFood(state.recentFoods, item)
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
          },
          recentFoods: items.reduce((acc, i) => upsertRecentFood(acc, i), state.recentFoods)
        })),

      addCustomFood: (item) => {
        const created: CustomFoodDef = { ...item, id: generateId() };
        set((state) => ({ customFoods: [...state.customFoods, created] }));
        return created;
      },

      saveMealAsTemplate: (name, items, barcode) => {
        const created: SavedMeal = {
          id: generateId(),
          name,
          ...(barcode ? { barcode } : {}),
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
          },
          recentFoods: meal.items.reduce((acc, i) => upsertRecentFood(acc, i), state.recentFoods)
        }));
      },

      deleteSavedMeal: (id) =>
        set((state) => ({ savedMeals: state.savedMeals.filter((m) => m.id !== id) })),

      toggleFavoriteFood: (food) => {
        const [next, isFavorite] = toggleFavoriteFoodEntry(
          get().favoriteFoods,
          food,
          FAVORITE_FOODS_LIMIT
        );
        set({ favoriteFoods: next });
        return isFavorite;
      },

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
        // Импортированная история не срезается политикой хранения (imported: true).
        const keptIds = new Set(prunedLogs.map((e) => e.id));
        const keptImported = state.setLogs.filter(
          (e) => e.imported === true && !keptIds.has(e.id)
        );

        set({
          setLogs: [...prunedLogs, ...keptImported, entry],
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

      importSetLogs: (entries) => {
        if (!entries.length) return { added: 0, skippedDuplicates: 0 };
        const fingerprint = (e: Omit<SetLogEntry, 'id'>): string =>
          `${e.exerciseId}|${e.dateKey}|${e.weight}|${e.reps}|${e.rir}`;
        const seen = new Set(get().setLogs.map(fingerprint));
        const fresh: SetLogEntry[] = [];
        let skippedDuplicates = 0;
        for (const e of entries) {
          const fp = fingerprint(e);
          if (seen.has(fp)) {
            skippedDuplicates += 1;
            continue;
          }
          seen.add(fp);
          fresh.push({ ...e, id: generateId(), imported: true });
        }
        if (fresh.length === 0) return { added: 0, skippedDuplicates };
        const state = get();
        const nextRecords = { ...state.personalRecords };
        for (const e of fresh) {
          if (e.weight > 0) {
            nextRecords[e.exerciseId] = Math.max(nextRecords[e.exerciseId] ?? 0, e.weight);
          }
        }
        set({ setLogs: [...state.setLogs, ...fresh], personalRecords: nextRecords });
        return { added: fresh.length, skippedDuplicates };
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
        if (data && typeof data === 'object' && 'bodyMeasurements' in data) {
          const raw = (data as { bodyMeasurements?: unknown }).bodyMeasurements;
          if (raw !== undefined && asBodyMeasurements(raw) === undefined) {
            throw new Error('Backup file has none of the expected fields');
          }
        }
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
