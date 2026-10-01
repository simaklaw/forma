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
