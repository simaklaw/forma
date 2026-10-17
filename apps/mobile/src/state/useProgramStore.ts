/**
 * Программа тренировок (Фаза 3, issue #158) — выбор длительности
 * 4/6/8 недель и пропуски дней. Движок — features/workout/program/programEngine.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { toDateKey } from '@/engines/WorkoutStats';
import type { ProgramLengthWeeks, ProgramState } from '@/features/workout/program/programEngine';

interface ProgramStore {
  program: ProgramState | null;
  startProgram: (lengthWeeks: ProgramLengthWeeks) => void;
  skipDay: (dateKey: string) => void;
  unskipDay: (dateKey: string) => void;
  resetProgram: () => void;
}

function isProgramLengthWeeks(value: unknown): value is ProgramLengthWeeks {
  return value === 4 || value === 6 || value === 8;
}

/** Defensive rehydrate: битый persisted-снапшот не ломает стор. */
function asProgramState(value: unknown): ProgramState | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  if (!isProgramLengthWeeks(raw.lengthWeeks)) return null;
  if (typeof raw.startDateKey !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(raw.startDateKey)) {
    return null;
  }
  const skippedDateKeys = Array.isArray(raw.skippedDateKeys)
    ? raw.skippedDateKeys.filter((k): k is string => typeof k === 'string')
    : [];
  return { lengthWeeks: raw.lengthWeeks, startDateKey: raw.startDateKey, skippedDateKeys };
}

export const useProgramStore = create<ProgramStore>()(
  persist(
    (set) => ({
      program: null,

      startProgram: (lengthWeeks) =>
        set({
          program: {
            lengthWeeks,
            startDateKey: toDateKey(new Date()),
            skippedDateKeys: []
          }
        }),

      skipDay: (dateKey) =>
        set((s) => {
          if (!s.program || s.program.skippedDateKeys.includes(dateKey)) return s;
          return {
            program: { ...s.program, skippedDateKeys: [...s.program.skippedDateKeys, dateKey] }
          };
        }),

      unskipDay: (dateKey) =>
        set((s) => {
          if (!s.program) return s;
          return {
            program: {
              ...s.program,
              skippedDateKeys: s.program.skippedDateKeys.filter((k) => k !== dateKey)
            }
          };
        }),

      resetProgram: () => set({ program: null })
    }),
    {
      name: 'fitpulse_program_v1',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<ProgramStore>;
        return { ...current, program: asProgramState(p.program) ?? current.program };
      }
    }
  )
);
