/**
 * workoutReminders slice — persisted (паттерн useStreakFreezeStore).
 * Локальные напоминания о тренировке: дни недели (0=Пн … 6=Вс) и время «HH:MM».
 * Стор хранит только настройки и не тянет expo-notifications — планирование
 * уведомлений живёт в engines/workoutReminders.ts (нужен нативный модуль,
 * появится после следующей сборки APK).
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const REMINDER_DAY_MIN = 0;
export const REMINDER_DAY_MAX = 6;
/** Пн, Ср, Пт — разумный дефолт для 3 тренировок в неделю. */
export const DEFAULT_REMINDER_DAYS: number[] = [0, 2, 4];
export const DEFAULT_REMINDER_TIME = '18:30';

export interface ReminderTimeParts {
  hh: number;
  mm: number;
}

/** Битое → дефолт; валидные элементы фильтруются, дедупятся и сортируются. */
export function normalizeReminderDays(input: unknown): number[] {
  if (!Array.isArray(input)) return [...DEFAULT_REMINDER_DAYS];
  const valid = new Set<number>();
  for (const raw of input) {
    const n = typeof raw === 'number' ? Math.round(raw) : Number.NaN;
    if (Number.isInteger(n) && n >= REMINDER_DAY_MIN && n <= REMINDER_DAY_MAX) {
      valid.add(n);
    }
  }
  return [...valid].sort((a, b) => a - b);
}

export function normalizeReminderTime(input: unknown): string {
  if (typeof input !== 'string') return DEFAULT_REMINDER_TIME;
  const m = /^(\d{1,2}):(\d{2})$/.exec(input.trim());
  if (!m) return DEFAULT_REMINDER_TIME;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (hh > 23 || mm > 59) return DEFAULT_REMINDER_TIME;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export function parseReminderTime(time: string): ReminderTimeParts {
  const normalized = normalizeReminderTime(time);
  const [hh, mm] = normalized.split(':').map(Number);
  return { hh, mm };
}

interface WorkoutRemindersStore {
  enabled: boolean;
  days: number[];
  time: string;
  setRemindersEnabled: (on: boolean) => void;
  setReminderDays: (days: number[]) => void;
  setReminderTime: (time: string) => void;
}

/** Оборонительный merge: старые/битые снапшоты получают дефолт. */
function mergeRemindersState(
  persisted: unknown,
  current: WorkoutRemindersStore
): WorkoutRemindersStore {
  const raw = (persisted ?? {}) as Partial<WorkoutRemindersStore>;
  const days = normalizeReminderDays(raw.days);
  return {
    ...current,
    enabled: raw.enabled === true,
    days: days.length > 0 ? days : [...DEFAULT_REMINDER_DAYS],
    time: normalizeReminderTime(raw.time)
  };
}

export const useWorkoutRemindersStore = create<WorkoutRemindersStore>()(
  persist(
    (set) => ({
      enabled: false,
      days: [...DEFAULT_REMINDER_DAYS],
      time: DEFAULT_REMINDER_TIME,
      setRemindersEnabled: (on) => set({ enabled: on === true }),
      setReminderDays: (days) => set({ days: normalizeReminderDays(days) }),
      setReminderTime: (time) => set({ time: normalizeReminderTime(time) })
    }),
    {
      name: 'fitpulse_workout_reminders_v1',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      merge: (persisted, current) => mergeRemindersState(persisted, current)
    }
  )
);
