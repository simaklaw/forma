import { toDateKey } from '@forma/core';
import type { DayMeals, FoodItem } from '@/state/useFitPulseStore';

/**
 * Compatibility shim — implementation lives in @forma/core.
 */
export {
  roundToStep,
  toDateKey,
  todayKey,
  weekdayRuShort,
  lastNDays,
  selectPersonalRecord,
  selectOverallPersonalRecord,
  pruneOldSetLogs,
  selectCurrentStreak,
  selectStreakDays,
  ruDayWord,
  selectWeeklyVolume,
  selectWeekDaysFullyCompleted,
  type SetLogEntry,
  type DayProgress,
  type DayStatus,
  type DayVolume,
} from "@forma/core";

/** Consecutive workout days ending today, based on set-log date keys. */
export function activityStreakDays(setLogs: { dateKey: string }[]): number {
  const dates = new Set(setLogs.map((entry) => entry.dateKey));
  let streak = 0;
  const cursor = new Date();
  while (dates.has(toDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** Dates with at least one food log; legacy items without timestamps count today. */
function foodLogDates(allMeals: DayMeals, todayKey: string): Set<string> {
  const allItems: FoodItem[] = [
    ...allMeals.breakfast,
    ...allMeals.lunch,
    ...allMeals.snack,
    ...allMeals.dinner
  ];
  return new Set(
    allItems.map((item) => (item.loggedAt ? toDateKey(new Date(item.loggedAt)) : todayKey))
  );
}

/**
 * Unified streak: a day counts if EITHER a workout set was logged OR at
 * least one food item was logged.
 */
export function unifiedStreakDays(
  setLogs: { dateKey: string }[],
  allMeals: DayMeals,
  now: Date = new Date()
): number {
  const workoutDates = new Set(setLogs.map((e) => e.dateKey));
  const todayKey = toDateKey(now);
  const mealDates = foodLogDates(allMeals, todayKey);
  let streak = 0;
  const cursor = new Date(now);
  while (workoutDates.has(toDateKey(cursor)) || mealDates.has(toDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export type ActivityLevel = 'none' | 'light' | 'full';

export interface DayActivity {
  dateKey: string;
  dayOfMonth: number;
  level: ActivityLevel;
  isToday: boolean;
  isFuture: boolean;
}

/**
 * Per-day activity level for a calendar month view.
 * 'full'  — workout AND nutrition logged that day
 * 'light' — only one of the two logged
 * 'none'  — neither
 * Mirrors Fitstars' ActivityDots concept (calendar heatmap).
 */
export function selectMonthActivity(
  setLogs: { dateKey: string }[],
  allMeals: {
    breakfast: { loggedAt?: number }[];
    lunch: { loggedAt?: number }[];
    snack: { loggedAt?: number }[];
    dinner: { loggedAt?: number }[];
  },
  year: number,
  month: number, // 0-based, as Date.getMonth()
  now: Date = new Date()
): DayActivity[] {
  const workoutDates = new Set(setLogs.map((e) => e.dateKey));
  const foodDates = new Set(
    [...allMeals.breakfast, ...allMeals.lunch, ...allMeals.snack, ...allMeals.dinner]
      .filter((i) => i.loggedAt)
      .map((i) => toDateKey(new Date(i.loggedAt!)))
  );

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayKey = toDateKey(now);

  const out: DayActivity[] = [];
  for (let day = 1; day <= daysInMonth; day += 1) {
    const d = new Date(year, month, day);
    const dateKey = toDateKey(d);
    const hasWorkout = workoutDates.has(dateKey);
    const hasFood = foodDates.has(dateKey);
    const level: ActivityLevel =
      hasWorkout && hasFood ? 'full' : hasWorkout || hasFood ? 'light' : 'none';
    out.push({
      dateKey,
      dayOfMonth: day,
      level,
      isToday: dateKey === todayKey,
      isFuture: dateKey > todayKey
    });
  }
  return out;
}
