/**
 * Global rest-timer preference (Fud AI pattern).
 * null  — use each exercise's planned restSeconds
 * 0     — rest timer off
 * 30–300 — fixed duration for every set
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const REST_PRESET_OPTIONS = [null, 0, 30, 45, 60, 90, 120, 150, 180, 240, 300] as const;

export type RestPresetSeconds = (typeof REST_PRESET_OPTIONS)[number];

interface RestTimerStore {
  /** null = plan default; 0 = off; otherwise fixed seconds. */
  overrideSeconds: RestPresetSeconds;
  setOverrideSeconds: (value: RestPresetSeconds) => void;
}

export function resolveRestSeconds(
  planSeconds: number,
  override: RestPresetSeconds
): number | null {
  if (override === 0) return null;
  if (override == null) return Math.max(0, planSeconds);
  return override;
}

export const useRestTimerStore = create<RestTimerStore>()(
  persist(
    (set) => ({
      overrideSeconds: null,
      setOverrideSeconds: (value) => set({ overrideSeconds: value })
    }),
    {
      name: 'fitpulse_rest_timer',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage)
    }
  )
);
