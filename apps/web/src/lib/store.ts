import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useEffect, useState } from "react";
import { EXERCISES, planById, planExercises } from "./catalog";
import { calcGoals, todayKey } from "./forma";
import type {
  MealItem,
  MealType,
  MeasurementEntry,
  Profile,
  Session,
  ThemeMode,
  WeightEntry,
  WorkoutLog,
} from "./types";
import {
  domainCompleteSet,
  domainEndSession,
  domainStartPlan,
  uiSetsFromDomain,
} from "./workout-session/dualWrite.ts";

export const COACH_WELCOME =
  "Я локальный тренер. Данные не уходят в облако. Спроси про белок, калории или тренировку.";

export type CoachMessage = { role: "user" | "coach"; text: string };

const COACH_MESSAGE_CAP = 40;

const defaultProfile = (): Profile =>
  applyGoals({
    name: "",
    presentation: "neutral",
    goal: "energy",
    equipment: [],
    minutes: 25,
    days: [1, 3, 5],
    heightCm: 170,
    weightKg: 70,
    age: 30,
    calorieGoal: 0,
    proteinGoal: 0,
    fatGoal: 0,
    carbsGoal: 0,
    onboarded: false,
    theme: "system",
  });

function defaultCoachMessages(): CoachMessage[] {
  return [{ role: "coach", text: COACH_WELCOME }];
}

function sanitizeCoachMessages(value: unknown): CoachMessage[] {
  if (!Array.isArray(value)) return defaultCoachMessages();
  const cleaned = value.filter(
    (m): m is CoachMessage =>
      !!m &&
      typeof m === "object" &&
      ((m as CoachMessage).role === "user" || (m as CoachMessage).role === "coach") &&
      typeof (m as CoachMessage).text === "string",
  );
  if (cleaned.length === 0) return defaultCoachMessages();
  return cleaned.slice(-COACH_MESSAGE_CAP);
}

type CustomFoodInput = {
  name: string;
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
};

type State = {
  profile: Profile;
  workouts: WorkoutLog[];
  meals: MealItem[];
  weights: WeightEntry[];
  measurements: MeasurementEntry[];
  photos: { before: string | null; after: string | null };
  session: Session | null;
  coachMessages: CoachMessage[];
  setProfile: (p: Partial<Profile>) => void;
  completeOnboarding: (p: Partial<Profile>) => void;
  logWorkout: (planId: string, regions: import("./types").MuscleRegion[]) => void;
  addMeal: (meal: MealType, foodId: string, grams: number) => void;
  addMealFromFood: (meal: MealType, food: CustomFoodInput, grams: number) => void;
  removeMeal: (id: string) => void;
  addWeight: (kg: number) => void;
  addMeasurement: (waist: number) => void;
  setPhoto: (slot: "before" | "after", dataUrl: string) => void;
  startSession: (planId: string) => void;
  toggleSet: (exerciseId: string, setIndex: number) => void;
  nextExercise: () => void;
  prevExercise: () => void;
  startRest: (sec: number) => void;
  clearRest: () => void;
  endSession: (completed: boolean) => void;
  setCoachMessages: (messages: CoachMessage[]) => void;
  clearCoachMessages: () => void;
  resetAll: () => void;
};

function applyGoals(profile: Profile): Profile {
  const macros = calcGoals(profile);
  return {
    ...profile,
    calorieGoal: macros.kcal,
    proteinGoal: macros.protein,
    fatGoal: macros.fat,
    carbsGoal: macros.carbs,
  };
}

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function emptySetsForPlan(planId: string): Record<string, boolean[]> {
  const plan = planById(planId);
  const setsDone: Record<string, boolean[]> = {};
  if (!plan) return setsDone;
  for (const id of plan.exerciseIds) {
    const ex = EXERCISES.find((e) => e.id === id);
    setsDone[id] = Array(ex?.sets ?? 3).fill(false);
  }
  return setsDone;
}

export const useAppStore = create<State>()(
  persist(
    (set, get) => ({
      profile: defaultProfile(),
      workouts: [],
      meals: [],
      weights: [],
      measurements: [],
      photos: { before: null, after: null },
      session: null,
      coachMessages: defaultCoachMessages(),

      setProfile: (p) =>
        set((s) => ({
          profile: applyGoals({ ...s.profile, ...p }),
        })),

      completeOnboarding: (p) =>
        set((s) => ({
          profile: applyGoals({ ...s.profile, ...p, onboarded: true }),
        })),

      logWorkout: (planId, regions) => {
        const date = todayKey();
        set((s) => ({
          workouts: [
            ...s.workouts.filter((w) => w.date !== date),
            { date, planId, completed: true, regions },
          ],
        }));
      },

      addMeal: (meal, foodId, grams) => {
        set((s) => ({
          meals: [...s.meals, { id: newId(), date: todayKey(), meal, foodId, grams }],
        }));
      },

      addMealFromFood: (meal, food, grams) => {
        set((s) => ({
          meals: [
            ...s.meals,
            {
              id: newId(),
              date: todayKey(),
              meal,
              foodId: `custom:${food.name}`,
              grams,
              name: food.name,
              kcal100: food.kcal,
              protein100: food.protein,
              fat100: food.fat,
              carbs100: food.carbs,
            },
          ],
        }));
      },

      removeMeal: (id) => set((s) => ({ meals: s.meals.filter((m) => m.id !== id) })),

      addWeight: (kg) => {
        const date = todayKey();
        set((s) => ({
          weights: [...s.weights.filter((w) => w.date !== date), { date, kg }],
          profile: applyGoals({ ...s.profile, weightKg: kg }),
        }));
      },

      addMeasurement: (waist) => {
        const date = todayKey();
        set((s) => ({
          measurements: [...s.measurements.filter((m) => m.date !== date), { date, waist }],
        }));
      },

      setPhoto: (slot, dataUrl) =>
        set((s) => ({ photos: { ...s.photos, [slot]: dataUrl } })),

      startSession: (planId) => {
        const plan = planById(planId);
        if (!plan) return;

        // Soft resume: same plan already open in UI — keep progress.
        const current = get().session;
        if (current && current.planId === planId) {
          void domainStartPlan(planId).then((result) => {
            if (!result.resumed || !result.session) return;
            const s = get().session;
            if (!s || s.planId !== planId) return;
            set({
              session: {
                ...s,
                exerciseIndex: result.session.currentStepIndex,
                setsDone: uiSetsFromDomain(result.session),
                restEndsAt: result.session.restEndsAtMs,
                startedAt: result.session.startedAtMs ?? s.startedAt,
              },
            });
          });
          return;
        }

        // Optimistic empty UI; domain may hydrate after resume.
        set({
          session: {
            planId,
            exerciseIndex: 0,
            setsDone: emptySetsForPlan(planId),
            restEndsAt: null,
            startedAt: Date.now(),
          },
        });

        void domainStartPlan(planId).then((result) => {
          if (!result.resumed || !result.session) return;
          const s = get().session;
          if (!s || s.planId !== planId) return;
          set({
            session: {
              planId,
              exerciseIndex: result.session.currentStepIndex,
              setsDone: uiSetsFromDomain(result.session),
              restEndsAt: result.session.restEndsAtMs,
              startedAt: result.session.startedAtMs ?? s.startedAt,
            },
          });
        });
      },

      toggleSet: (exerciseId, setIndex) => {
        const s = get();
        if (!s.session) return;
        const arr = [...(s.session.setsDone[exerciseId] ?? [])];
        const wasDone = Boolean(arr[setIndex]);
        arr[setIndex] = !wasDone;
        set({
          session: {
            ...s.session,
            setsDone: { ...s.session.setsDone, [exerciseId]: arr },
          },
        });
        if (!wasDone) {
          const ex = EXERCISES.find((e) => e.id === exerciseId);
          void domainCompleteSet({
            exerciseId,
            reps: ex?.reps ?? 0,
            restSec: ex?.restSec ?? 0,
          });
        }
      },

      nextExercise: () =>
        set((s) => {
          if (!s.session) return s;
          const plan = planById(s.session.planId);
          if (!plan) return s;
          const max = plan.exerciseIds.length - 1;
          return {
            session: {
              ...s.session,
              exerciseIndex: Math.min(max, s.session.exerciseIndex + 1),
              restEndsAt: null,
            },
          };
        }),

      prevExercise: () =>
        set((s) => {
          if (!s.session) return s;
          return {
            session: {
              ...s.session,
              exerciseIndex: Math.max(0, s.session.exerciseIndex - 1),
              restEndsAt: null,
            },
          };
        }),

      startRest: (sec) =>
        set((s) => {
          if (!s.session) return s;
          return { session: { ...s.session, restEndsAt: Date.now() + sec * 1000 } };
        }),

      clearRest: () =>
        set((s) => {
          if (!s.session) return s;
          return { session: { ...s.session, restEndsAt: null } };
        }),

      endSession: (completed) => {
        const s = get();
        if (!s.session) return;
        if (completed) {
          const plan = planById(s.session.planId);
          const regions = plan ? planExercises(plan).flatMap((e) => e.regions) : [];
          const unique = [...new Set(regions)];
          get().logWorkout(s.session.planId, unique);
        }
        void domainEndSession(completed);
        set({ session: null });
      },

      setCoachMessages: (messages) =>
        set({
          coachMessages: messages.slice(-COACH_MESSAGE_CAP),
        }),

      clearCoachMessages: () => set({ coachMessages: defaultCoachMessages() }),

      resetAll: () =>
        set({
          profile: defaultProfile(),
          workouts: [],
          meals: [],
          weights: [],
          measurements: [],
          photos: { before: null, after: null },
          session: null,
          coachMessages: defaultCoachMessages(),
        }),
    }),
    {
      name: "forma-v1",
      partialize: (s) => ({
        profile: s.profile,
        workouts: s.workouts,
        meals: s.meals,
        weights: s.weights,
        measurements: s.measurements,
        photos: s.photos,
        coachMessages: s.coachMessages,
        // Soft nav / refresh: keep UI progress; domain journal remains source of truth on cold start.
        session: s.session,
      }),
      skipHydration: true,
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        try {
          useAppStore.setState({
            profile: applyGoals(state.profile),
            coachMessages: sanitizeCoachMessages(state.coachMessages),
          });
        } catch {
          useAppStore.setState({
            profile: defaultProfile(),
            coachMessages: defaultCoachMessages(),
          });
        }
      },
    },
  ),
);

export function useHydrated(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    void Promise.resolve(useAppStore.persist.rehydrate()).finally(() => setReady(true));
  }, []);
  return ready;
}

export function applyTheme(theme: ThemeMode) {
  const dark =
    theme === "dark" ||
    (theme !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}
