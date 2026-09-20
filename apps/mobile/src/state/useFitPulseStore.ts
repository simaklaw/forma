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
const COACH_MESSAGE_CAP = 40;

export const COACH_WELCOME =
  'Я локальный тренер. Данные не уходят в облако. Спроси про белок, калории или тренировку.';

export interface CoachMessage {
  id: string;
  role: 'user' | 'coach';
  text: string;
}

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

function defaultCoachMessages(): CoachMessage[] {
  return [{ id: 'welcome', role: 'coach', text: COACH_WELCOME }];
}

function sanitizeCoachMessages(value: unknown): CoachMessage[] {
  if (!Array.isArray(value)) return defaultCoachMessages();
  const cleaned = value.filter(
    (m): m is CoachMessage =>
      !!m &&
      typeof m === 'object' &&
      typeof (m as CoachMessage).id === 'string' &&
      ((m as CoachMessage).role === 'user' || (m as CoachMessage).role === 'coach') &&
      typeof (m as CoachMessage).text === 'string'
  );
  if (cleaned.length === 0) return defaultCoachMessages();
  return cleaned.slice(-COACH_MESSAGE_CAP);
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

interface AppStore {
  profile: StoredProfile;
  metabolic: MetabolicStatus;
  todayMeals: DayMeals;
  customFoods: CustomFoodDef[];
  waterGlasses: number;
  weightHistory: number[];
  setLogs: SetLogEntry[];
  dayProgress: DayProgress;
  personalRecords: Record<number, number>;
  coachMessages: CoachMessage[];

  updateProfile: (newProfile: Partial<StoredProfile>) => void;
  triggerRefeed: () => void;
  triggerDietBreak: () => void;
  addFoodItem: (mealType: keyof DayMeals, item: Omit<FoodItem, 'id'>) => void;
  removeFoodItem: (mealType: keyof DayMeals, id: string) => void;
  addCustomFood: (item: Omit<CustomFoodDef, 'id'>) => CustomFoodDef;
  setWater: (count: number) => void;
  logWeight: (weight: number) => void;

  recordSet: (exerciseId: number, weight: number, reps: number, rir: number) => number;
  completedSetsToday: (exerciseId: number) => number;

  setCoachMessages: (messages: CoachMessage[]) => void;
  clearCoachMessages: () => void;

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
        | 'waterGlasses'
        | 'weightHistory'
        | 'setLogs'
        | 'dayProgress'
        | 'personalRecords'
        | 'coachMessages'
      >
    >
  ) => void;
}

export const useFitPulseStore = create<AppStore>()(
  persist(
    (set, get) => ({
      profile: emptyProfile(),
      metabolic: { type: null, endsAt: null },
      todayMeals: { breakfast: [], lunch: [], snack: [], dinner: [] },
      customFoods: [],
      waterGlasses: 0,
      weightHistory: [],
      setLogs: [],
      dayProgress: {},
      personalRecords: {},
      coachMessages: defaultCoachMessages(),

      updateProfile: (newProfile) =>
        set((state) => ({ profile: mergeProfile(state.profile, newProfile) })),

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

      setWater: (count) => set({ waterGlasses: count }),

      logWeight: (weight) =>
        set((state) => ({
          profile: { ...state.profile, weight: asPositiveNumber(weight) },
          weightHistory: [...state.weightHistory, weight].filter((n) => Number.isFinite(n) && n > 0).slice(-30)
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

      setCoachMessages: (messages) => set({ coachMessages: messages.slice(-COACH_MESSAGE_CAP) }),
      clearCoachMessages: () => set({ coachMessages: defaultCoachMessages() }),

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
        if (typeof data.waterGlasses === 'number') next.waterGlasses = data.waterGlasses;
        if (Array.isArray(data.weightHistory) && data.weightHistory.every((n) => typeof n === 'number')) {
          next.weightHistory = data.weightHistory;
        }
        if (
          Array.isArray(data.setLogs) &&
          data.setLogs.every(
            (e) => e && typeof e === 'object' && typeof e.exerciseId === 'number' && typeof e.dateKey === 'string'
          )
        ) {
          next.setLogs = data.setLogs;
        }
        if (data.dayProgress && typeof data.dayProgress === 'object') next.dayProgress = data.dayProgress;
        if (
          data.personalRecords &&
          typeof data.personalRecords === 'object' &&
          Object.values(data.personalRecords).every((v) => typeof v === 'number')
        ) {
          next.personalRecords = data.personalRecords;
        }
        if (data.coachMessages !== undefined) {
          next.coachMessages = sanitizeCoachMessages(data.coachMessages);
        }

        if (Object.keys(next).length === 0) {
          throw new Error(
            'Backup file has none of the expected fields (profile/metabolic/todayMeals/waterGlasses/weightHistory/setLogs/dayProgress/personalRecords/coachMessages)'
          );
        }
        set(next);
      }
    }),
    {
      name: 'fitpulse_production_state',
      storage: createJSONStorage(() => AsyncStorage),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<AppStore>;
        return {
          ...current,
          ...p,
          profile: mergeProfile(current.profile, p.profile),
          customFoods: Array.isArray(p.customFoods) ? p.customFoods : current.customFoods,
          coachMessages: sanitizeCoachMessages(p.coachMessages ?? current.coachMessages)
        };
      }
    }
  )
);

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
