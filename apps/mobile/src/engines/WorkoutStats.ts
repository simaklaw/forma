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

/** Did the user log at least one food item on this date? */
function hasLoggedFoodOn(allMeals: DayMeals, dateKey: string): boolean {
  const allItems: FoodItem[] = [
    ...allMeals.breakfast,
    ...allMeals.lunch,
    ...allMeals.snack,
    ...allMeals.dinner
  ];
  return allItems.some((i) => i.loggedAt && toDateKey(new Date(i.loggedAt)) === dateKey);
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
  let streak = 0;
  const cursor = new Date(now);
  while (
    workoutDates.has(toDateKey(cursor)) ||
    hasLoggedFoodOn(allMeals, toDateKey(cursor))
  ) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
