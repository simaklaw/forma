/**
 * exerciseGoal slice — persisted (паттерн useStreakFreezeStore).
 * Цели по упражнению: целевой вес + прогресс по сет-логам
 * (см. engines/exerciseGoals.ts). Карточка — components/ExerciseGoalCard.tsx.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalizeGoals, type ExerciseGoal } from '@/engines/exerciseGoals';

interface ExerciseGoalStore {
  goals: ExerciseGoal[];
  /** Добавить/обновить цель по упражнению (одна цель на упражнение). */
  addGoal: (exerciseId: number, targetWeightKg: number) => void;
  removeGoal: (exerciseId: number) => void;
}

/** Оборонительный merge: битые снапшоты получают нормализованный список целей. */
function mergeExerciseGoalState(persisted: unknown, current: ExerciseGoalStore): ExerciseGoalStore {
  const raw = (persisted ?? {}) as Partial<ExerciseGoalStore>;
  return { ...current, goals: normalizeGoals(raw.goals) };
}

export const useExerciseGoalStore = create<ExerciseGoalStore>()(
  persist(
    (set) => ({
      goals: [],
      addGoal: (exerciseId, targetWeightKg) =>
        set((state) => ({
          goals: [
            ...state.goals.filter((g) => g.exerciseId !== exerciseId),
            { exerciseId, targetWeightKg, createdAt: Date.now() }
          ]
        })),
      removeGoal: (exerciseId) =>
        set((state) => ({ goals: state.goals.filter((g) => g.exerciseId !== exerciseId) }))
    }),
    {
      name: 'fitpulse_exercise_goals',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      merge: (persisted, current) => mergeExerciseGoalState(persisted, current)
    }
  )
);
