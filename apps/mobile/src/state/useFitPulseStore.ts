/**
 * useFitPulseStore.ts
 *
 * This is the report's MetabolicEngine.ts store, adapted for React Native:
 *   - createJSONStorage(() => localStorage) doesn't work on native — there is
 *     no localStorage. Swapped for @react-native-async-storage/async-storage.
 *   - calculateTargets()/detectWeightPlateau() delegate to the pure functions
 *     in src/engines/MetabolicEngine.ts instead of reimplementing the math
 *     inline, so the formulas have exactly one source of truth.
 *   - Food items get a stable id (crypto.randomUUID isn't available in RN's
 *     JS engine by default) via a small local id generator instead.
 *
 * Обновление: `setLogs` used to grow forever (every set, every session,
 * re-serialized to AsyncStorage in full on every write — see
 * pruneOldSetLogs's doc in WorkoutStats.ts). `recordSet` now prunes to
 * SET_LOG_RETENTION_DAYS on every write, and `personalRecords` is a
 * separate, never-pruned running max per exercise so no all-time record is
 * ever lost to that rotation. A debounced/batched AsyncStorage write was
 * considered too (to coalesce rapid writes) and skipped for now: with
 * setLogs bounded, the persisted payload stays small (a few hundred
 * entries at most) and writes only happen once per completed
 * set/food/weight entry, not per render or per keystroke — premature until
 * real usage shows otherwise.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ProfileState,
  MetabolicStatus,
  Targets,
  Goal,
  calculateTargets as calcTargets,
  detectWeightPlateau as detectPlateau,
  startRefeed,
  startDietBreak
} from '@/engines/MetabolicEngine';
import { SetLogEntry, DayProgress, toDateKey, pruneOldSetLogs } from '@/engines/WorkoutStats';

export type { SetLogEntry, DayProgress } from '@/engines/WorkoutStats';

const SET_LOG_RETENTION_DAYS = 180;

export interface FoodItem {
  id: string;
  name: string;
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  /** When this item was actually added — powers the real per-item time
   *  shown in NutritionScreen. Optional so backups/imports from before this
   *  field existed still validate and load (see hydrate() below); items
   *  missing it just show no time instead of a fake one. */
  loggedAt?: number;
}

export interface DayMeals {
  breakfast: FoodItem[];
  lunch: FoodItem[];
  snack: FoodItem[];
  dinner: FoodItem[];
}

/**
 * One completed set, written by ExerciseSheet.recordNextSet() for whichever
 * exercise the set belongs to. This is what used to only exist for exercise
 * №1 (see HANDOFF.md) — now every exercise across every day in
 * WorkoutScreen's WORKOUT_PLAN
 * array writes here, which is what makes a real weekly-volume chart
 * (ProgressScreen) and a real "выполнено на неделе" count (WorkoutScreen's
 * ticket) possible instead of fixed demo arrays. Type + the pure
 * date/aggregation helpers live in engines/WorkoutStats.ts, not here — see
 * that file's header for why (testability without mocking AsyncStorage).
 */
function generateId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

interface AppStore {
  profile: ProfileState;
  metabolic: MetabolicStatus;
  todayMeals: DayMeals;
  waterGlasses: number;
  weightHistory: number[];
  setLogs: SetLogEntry[];
  dayProgress: DayProgress;
  /** exerciseId -> heaviest weight ever logged for it. Never pruned — see
   *  the header comment above and pruneOldSetLogs's doc in WorkoutStats.ts
   *  for why this, not setLogs, is the all-time source of truth. */
  personalRecords: Record<number, number>;

  updateProfile: (newProfile: Partial<ProfileState>) => void;
  triggerRefeed: () => void;
  triggerDietBreak: () => void;
  addFoodItem: (mealType: keyof DayMeals, item: Omit<FoodItem, 'id'>) => void;
  removeFoodItem: (mealType: keyof DayMeals, id: string) => void;
  setWater: (count: number) => void;
  logWeight: (weight: number) => void;

  /** Records one completed set for an exercise "today" and returns the new
   *  completed-set count for that exercise today (so the caller — ExerciseSheet
   *  — can decide locally whether the exercise is now finished, without a
   *  second store read). */
  recordSet: (exerciseId: number, weight: number, reps: number, rir: number) => number;
  /** Completed-set count for an exercise today (0 if nothing logged yet). */
  completedSetsToday: (exerciseId: number) => number;

  calculateTargets: () => Targets;
  isPlateauSuspected: () => boolean;
  hydrate: (
    data: Partial<
      Pick<
        AppStore,
        'profile' | 'metabolic' | 'todayMeals' | 'waterGlasses' | 'weightHistory' | 'setLogs' | 'dayProgress' | 'personalRecords'
      >
    >
  ) => void;
}

export const useFitPulseStore = create<AppStore>()(
  persist(
    (set, get) => ({
      profile: {
        sex: 'male',
        age: 26,
        height: 178,
        weight: 76,
        pal: 1.375,
        goal: 'recomp' as Goal
      },
      metabolic: {
        type: null,
        endsAt: null
      },
      todayMeals: {
        breakfast: [],
        lunch: [],
        snack: [],
        dinner: []
      },
      waterGlasses: 0,
      // Обновление: was seeded with a fake demo trend ([78.0, 77.5, 76.8,
      // 76.0]) that a brand-new user would see as if it were their own
      // history. Starts empty and honest now — WeightChart already renders
      // nothing for <2 points, and detectWeightPlateau already requires a
      // minimum sample size, so both handle this correctly with no changes.
      weightHistory: [],
      setLogs: [],
      dayProgress: {},
      personalRecords: {},

      updateProfile: (newProfile) => set((state) => ({ profile: { ...state.profile, ...newProfile } })),

      triggerRefeed: () => set({ metabolic: startRefeed() }),

      triggerDietBreak: () => set({ metabolic: startDietBreak() }),

      addFoodItem: (mealType, item) =>
        set((state) => ({
          todayMeals: {
            ...state.todayMeals,
            [mealType]: [...state.todayMeals[mealType], { ...item, id: generateId(), loggedAt: Date.now() }]
          }
        })),

      removeFoodItem: (mealType, id) =>
        set((state) => ({
          todayMeals: {
            ...state.todayMeals,
            [mealType]: state.todayMeals[mealType].filter((i) => i.id !== id)
          }
        })),

      setWater: (count) => set({ waterGlasses: count }),

      logWeight: (weight) =>
        set((state) => ({
          profile: { ...state.profile, weight },
          weightHistory: [...state.weightHistory, weight].slice(-30)
        })),

      recordSet: (exerciseId, weight, reps, rir) => {
        const todayKey = toDateKey(new Date());
        const entry: SetLogEntry = { id: generateId(), exerciseId, dateKey: todayKey, weight, reps, rir };
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
        return calcTargets(profile, metabolic);
      },

      isPlateauSuspected: () => {
        const { weightHistory, profile } = get();
        return detectPlateau(weightHistory, profile.goal);
      },

      /**
       * Restores state from an exported backup (see ProfileScreen.tsx's
       * exportData/importData). Previously import only restored `profile`
       * (see HANDOFF.md item 1) — this now covers every persisted field,
       * with shape checks so a malformed/foreign JSON file fails loudly
       * instead of silently corrupting the store with `undefined`s.
       */
      hydrate: (data) => {
        const current = get();
        const next: Partial<AppStore> = {};

        if (data.profile && typeof data.profile === 'object') {
          next.profile = { ...current.profile, ...data.profile };
        }
        if (
          data.metabolic &&
          typeof data.metabolic === 'object' &&
          ('type' in data.metabolic) &&
          ('endsAt' in data.metabolic)
        ) {
          next.metabolic = data.metabolic;
        }
        if (data.todayMeals && typeof data.todayMeals === 'object') {
          const keys: (keyof DayMeals)[] = ['breakfast', 'lunch', 'snack', 'dinner'];
          const valid = keys.every((k) => Array.isArray((data.todayMeals as DayMeals)[k]));
          if (valid) next.todayMeals = data.todayMeals as DayMeals;
        }
        if (typeof data.waterGlasses === 'number') {
          next.waterGlasses = data.waterGlasses;
        }
        if (Array.isArray(data.weightHistory) && data.weightHistory.every((n) => typeof n === 'number')) {
          next.weightHistory = data.weightHistory;
        }
        if (
          Array.isArray(data.setLogs) &&
          data.setLogs.every((e) => e && typeof e === 'object' && typeof e.exerciseId === 'number' && typeof e.dateKey === 'string')
        ) {
          next.setLogs = data.setLogs;
        }
        if (data.dayProgress && typeof data.dayProgress === 'object') {
          next.dayProgress = data.dayProgress;
        }
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
    {
      name: 'fitpulse_production_state',
      storage: createJSONStorage(() => AsyncStorage)
    }
  )
);

/** Convenience selector: total kcal/macros eaten today across all meals. */
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
