/**
 * WorkoutStats — pure aggregation helpers (no Zustand / React / I/O).
 */

export function roundToStep(value: number, step: number): number {
  return Math.round(Math.round(value / step) * step * 100) / 100;
}

export interface SetLogEntry {
  id: string;
  exerciseId: number;
  dateKey: string;
  weight: number;
  reps: number;
  rir: number;
}

export type DayProgress = Record<string, Record<number, number>>;

export function toDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Alias used by the web client. */
export const todayKey = toDateKey;

const WEEKDAY_RU_SHORT = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

export function weekdayRuShort(date: Date): string {
  return WEEKDAY_RU_SHORT[date.getDay()];
}

export function lastNDays(days: number, now: Date = new Date()): Date[] {
  const out: Date[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    out.push(d);
  }
  return out;
}

export function selectPersonalRecord(setLogs: SetLogEntry[], exerciseId?: number): number | null {
  const relevant = exerciseId === undefined ? setLogs : setLogs.filter((e) => e.exerciseId === exerciseId);
  if (relevant.length === 0) return null;
  return Math.max(...relevant.map((e) => e.weight));
}

export function selectOverallPersonalRecord(personalRecords: Record<number, number>): number | null {
  const values = Object.values(personalRecords);
  return values.length ? Math.max(...values) : null;
}

export function pruneOldSetLogs(
  setLogs: SetLogEntry[],
  retentionDays: number,
  now: Date = new Date(),
): SetLogEntry[] {
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - retentionDays);
  const cutoffKey = toDateKey(cutoff);
  return setLogs.filter((e) => e.dateKey >= cutoffKey);
}

export function selectCurrentStreak(
  dayProgress: DayProgress,
  exercises: { id: number; totalSets: number }[],
  now: Date = new Date(),
): number {
  const isComplete = (d: Date) => {
    const progress = dayProgress[toDateKey(d)];
    if (!progress) return false;
    return exercises.every((ex) => (progress[ex.id] ?? 0) >= ex.totalSets);
  };

  const cursor = new Date(now);
  if (!isComplete(cursor)) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;
  while (isComplete(cursor)) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export type DayStatus = "done" | "today-in-progress" | "missed";

export function selectStreakDays(
  dayProgress: DayProgress,
  exercises: { id: number; totalSets: number }[],
  days = 7,
  now: Date = new Date(),
): DayStatus[] {
  const window = lastNDays(days, now);
  const today = toDateKey(now);
  return window.map((d) => {
    const progress = dayProgress[toDateKey(d)];
    const complete =
      Boolean(progress) && exercises.every((ex) => (progress![ex.id] ?? 0) >= ex.totalSets);
    if (complete) return "done";
    return toDateKey(d) === today ? "today-in-progress" : "missed";
  });
}

export function ruDayWord(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "день";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "дня";
  return "дней";
}

export interface DayVolume {
  dateKey: string;
  label: string;
  volumeKg: number;
  pct: number;
}

export function selectWeeklyVolume(
  setLogs: SetLogEntry[],
  days = 7,
  now: Date = new Date(),
): DayVolume[] {
  const window = lastNDays(days, now);
  const totals = new Map<string, number>();
  for (const entry of setLogs) {
    totals.set(entry.dateKey, (totals.get(entry.dateKey) ?? 0) + entry.weight * entry.reps);
  }

  const raw = window.map((d) => ({
    dateKey: toDateKey(d),
    label: weekdayRuShort(d),
    volumeKg: totals.get(toDateKey(d)) ?? 0,
  }));

  const max = Math.max(1, ...raw.map((r) => r.volumeKg));
  return raw.map((r) => ({ ...r, pct: Math.round((r.volumeKg / max) * 100) }));
}

export function selectWeekDaysFullyCompleted(
  dayProgress: DayProgress,
  exercises: { id: number; totalSets: number }[],
  days = 7,
  now: Date = new Date(),
): number {
  const window = lastNDays(days, now);
  return window.filter((d) => {
    const progress = dayProgress[toDateKey(d)];
    if (!progress) return false;
    return exercises.every((ex) => (progress[ex.id] ?? 0) >= ex.totalSets);
  }).length;
}
