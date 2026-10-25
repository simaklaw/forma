/**
 * customWorkouts slice — persisted (паттерн useStreakFreezeStore).
 * Список пользовательских тренировок для сегмента «Мои» в каталоге и
 * запуска в WorkoutScreen через dayId `custom-<id>`.
 * Логика нормализации — features/workout/customWorkouts.ts.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { toDateKey } from '@/engines/WorkoutStats';
import {
  normalizeCustomItems,
  normalizeCustomWorkoutName,
  normalizeCustomWorkouts,
  type CustomWorkout,
  type CustomWorkoutItem
} from '@/features/workout/customWorkouts';

interface CustomWorkoutStore {
  workouts: CustomWorkout[];
  createWorkout: (name: string) => string;
  renameWorkout: (id: string, name: string) => void;
  setWorkoutItems: (id: string, items: CustomWorkoutItem[]) => void;
  duplicateWorkout: (id: string, name: string) => string | null;
  deleteWorkout: (id: string) => void;
}

function newCustomWorkoutId(): string {
  return 'cw-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function todayKey(): string {
  return toDateKey(new Date());
}

function patchWorkout(
  workouts: CustomWorkout[],
  id: string,
  patch: (w: CustomWorkout) => CustomWorkout
): CustomWorkout[] {
  let touched = false;
  const next = workouts.map((w) => {
    if (w.id !== id) return w;
    touched = true;
    return { ...patch(w), updatedAtKey: todayKey() };
  });
  return touched ? next : workouts;
}

/** Оборонительный merge: битый persisted-снапшот не ломает стор. */
function mergeCustomWorkoutState(persisted: unknown, current: CustomWorkoutStore): CustomWorkoutStore {
  const raw = (persisted ?? {}) as Partial<CustomWorkoutStore>;
  return { ...current, workouts: normalizeCustomWorkouts(raw.workouts, todayKey()) };
}

export const useCustomWorkoutStore = create<CustomWorkoutStore>()(
  persist(
    (set, get) => ({
      workouts: [],

      createWorkout: (name) => {
        const id = newCustomWorkoutId();
        const workout: CustomWorkout = {
          id,
          name: normalizeCustomWorkoutName(name),
          items: [],
          createdAtKey: todayKey(),
          updatedAtKey: todayKey()
        };
        set((s) => ({ workouts: [workout, ...s.workouts] }));
        return id;
      },

      renameWorkout: (id, name) =>
        set((s) => ({
          workouts: patchWorkout(s.workouts, id, (w) => ({
            ...w,
            name: normalizeCustomWorkoutName(name) || w.name
          }))
        })),

      setWorkoutItems: (id, items) =>
        set((s) => ({
          workouts: patchWorkout(s.workouts, id, (w) => ({
            ...w,
            items: normalizeCustomItems(items)
          }))
        })),

      duplicateWorkout: (id, name) => {
        const source = get().workouts.find((w) => w.id === id);
        if (!source) return null;
        const newId = newCustomWorkoutId();
        const copy: CustomWorkout = {
          id: newId,
          name: normalizeCustomWorkoutName(name),
          items: source.items.map((item) => ({ ...item })),
          createdAtKey: todayKey(),
          updatedAtKey: todayKey()
        };
        set((s) => ({ workouts: [copy, ...s.workouts] }));
        return newId;
      },

      deleteWorkout: (id) =>
        set((s) => ({ workouts: s.workouts.filter((w) => w.id !== id) }))
    }),
    {
      name: 'fitpulse_custom_workouts_v1',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      merge: (persisted, current) => mergeCustomWorkoutState(persisted, current)
    }
  )
);
