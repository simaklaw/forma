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

export type StoredProfile = {
  sex: Sex | null;
  age: number | null;
  height: number | null;
  weight: number | null;
  pal: number;
  goal: Goal;
};

function generateId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function asPositiveNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

function asSex(value: unknown): Sex | null {
  return value === 'male' || value === 'female' ? value : null;
}

function emptyProfile(): StoredProfile {
  return {
    sex: null,
    age: null,
    height: null,
    weight: null,
    pal: 1.375,
    goal: 'recomp'
  };
}

function mergeProfile(base: StoredProfile, patch: unknown): StoredProfile {
  if (!patch || typeof patch !== 'object') return base;
  const p = patch as Record<string, unknown>;
  return {
    sex: 'sex' in p ? asSex(p.sex) : base.sex,
    age: 'age' in p ? asPositiveNumber(p.age) : base.age,
    height: 'height' in p ? asPositiveNumber(p.height) : base.height,
    weight: 'weight' in p ? asPositiveNumber(p.weight) : base.weight,
    pal: typeof p.pal === 'number' && Number.isFinite(p.pal) ? p.pal : base.pal,
    goal: p.goal === 'gain' || p.goal === 'maintain' || p.goal === 'recomp' ? p.goal : base.goal
  };
}

/** Best-effort HC weight export without static RN import at module load. */
function scheduleWeightExport(weightKg: number): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { HealthConnectService } = require('@/features/health/HealthConnectService') as {
      HealthConnectService: { writeWeightKg: (w: number) => Promise<boolean> };
    };
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
  setLogs: SetLogEntry[];
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

  recordSet: (exerciseId: number, weight: number, reps: number, rir: number) => number;
  completedSetsToday: (exerciseId: number) => number;

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
        | 'setLogs'
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
    weightHistory: Array.isArray(p.weightHistory) ? p.weightHistory : current.weightHistory,
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
      setLogs: [],
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
        const key = item.name.trim().toLowerCase();
        const existing = get().customFoods.find((f) => f.name.trim().toLowerCase() === key);
        if (existing) {
          const updated: CustomFoodDef = { ...existing, ...item };
          set((s) => ({
            customFoods: s.customFoods.map((f) => (f.id === existing.id ? updated : f))
          }));
          return updated;
        }
        const created: CustomFoodDef = { ...item, id: uuidv7() };
        set((s) => ({ customFoods: [...s.customFoods, created] }));
        return created;
      },

      saveMealAsTemplate: (name, items) => {
        const template: SavedMeal = {
          id: uuidv7(),
          name: name.trim() || 'Без названия',
          items: items.map(({ id: _id, loggedAt: _loggedAt, ...rest }) => rest)
        };
        set((s) => ({ savedMeals: [...s.savedMeals, template] }));
        return template;
      },

      logSavedMeal: (mealType, savedMealId) => {
        const template = get().savedMeals.find((m) => m.id === savedMealId);
        if (!template) return;
        set((state) => ({
          todayMeals: {
            ...state.todayMeals,
            [mealType]: [
              ...state.todayMeals[mealType],
              ...template.items.map((i) => ({ ...i, id: generateId(), loggedAt: Date.now() }))
            ]
          }
        }));
      },

      deleteSavedMeal: (id) =>
        set((s) => ({ savedMeals: s.savedMeals.filter((m) => m.id !== id) })),

      setWater: (count) => set({ waterGlasses: count }),

      logWeight: (weight) => {
        const w = asPositiveNumber(weight);
        if (w == null) return;
        set((state) => ({
          profile: { ...state.profile, weight: w },
          weightHistory: [...state.weightHistory, w].slice(-30)
        }));
        scheduleWeightExport(w);
      },

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
        const current = get();
        const next: Partial<AppStore> = {};

        if (data.profile && typeof data.profile === 'object') {
          next.profile = mergeProfile(current.profile, data.profile);
        }
        if (
          data.metabolic &&
          typeof data.metabolic === 'object' &&
          'type' in data.metabolic &&
          'endsAt' in data.metabolic
        ) {
          next.metabolic = data.metabolic;
        }
        if (data.todayMeals && typeof data.todayMeals === 'object') {
          const keys: (keyof DayMeals)[] = ['breakfast', 'lunch', 'snack', 'dinner'];
          const valid = keys.every((k) => Array.isArray((data.todayMeals as DayMeals)[k]));
          if (valid) next.todayMeals = data.todayMeals as DayMeals;
        }
        if (Array.isArray(data.customFoods)) {
          next.customFoods = data.customFoods as CustomFoodDef[];
        }
        if (Array.isArray(data.savedMeals)) {
          next.savedMeals = data.savedMeals as SavedMeal[];
        }
        if (typeof data.waterGlasses === 'number') next.waterGlasses = data.waterGlasses;
        if (
          Array.isArray(data.weightHistory) &&
          data.weightHistory.every((n) => typeof n === 'number')
        ) {
          next.weightHistory = data.weightHistory;
        }
        if (
          Array.isArray(data.setLogs) &&
          data.setLogs.every(
            (e) =>
              e &&
              typeof e === 'object' &&
              typeof e.exerciseId === 'number' &&
              typeof e.dateKey === 'string'
          )
        ) {
          next.setLogs = data.setLogs;
        }
        if (data.dayProgress && typeof data.dayProgress === 'object')
          next.dayProgress = data.dayProgress;
        if (
          data.personalRecords &&
          typeof data.personalRecords === 'object' &&
          Object.values(data.personalRecords).every((v) => typeof v === 'number')
        ) {
          next.personalRecords = data.personalRecords;
        }

        if (Object.keys(next).length === 0) {
          throw new Error(
            'Backup file has none of the expected fields (profile/metabolic/todayMeals/waterGlasses/weightHistory/setLogs/dayProgress/personalRecords)'
          );
        }
        set(next);
      }
    }),
    /**
     * `version` + `migrate` here follow the same pattern as the SQLite migration
     * runner (apps/mobile/src/features/workout/data/sqlite/runMigrations.ts):
     * bump `version` and add a `migrate(persistedState, fromVersion)` function
     * whenever a field's shape changes in a backward-incompatible way. Right
     * now version 1 is just the baseline — `merge` below defends against
     * malformed/missing fields from an older or corrupted store, but does not
     * yet need to transform data between shapes.
     */
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
