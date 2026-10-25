/**
 * streakFreeze slice — persisted (паттерн useVoiceCuesStore).
 * Замороженные дни серии: пустой день со «съеденной» заморозкой не разрывает
 * серию (см. engines/streakFreeze.ts). Реконсиляция — эффект в App.tsx.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalizeFrozenDates } from '@/engines/streakFreeze';

interface StreakFreezeStore {
  frozenDates: string[];
  applyReconciled: (next: string[]) => void;
}

/** Оборонительный merge: старые/битые снапшоты получают пустой список заморозок. */
function mergeStreakFreezeState(persisted: unknown, current: StreakFreezeStore): StreakFreezeStore {
  const raw = (persisted ?? {}) as Partial<StreakFreezeStore>;
  return { ...current, frozenDates: normalizeFrozenDates(raw.frozenDates) };
}

export const useStreakFreezeStore = create<StreakFreezeStore>()(
  persist(
    (set) => ({
      frozenDates: [],
      applyReconciled: (next) =>
        set((state) =>
          state.frozenDates.length === next.length &&
          state.frozenDates.every((d, i) => d === next[i])
            ? state
            : { frozenDates: next }
        )
    }),
    {
      name: 'fitpulse_streak_freeze',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      merge: (persisted, current) => mergeStreakFreezeState(persisted, current)
    }
  )
);
