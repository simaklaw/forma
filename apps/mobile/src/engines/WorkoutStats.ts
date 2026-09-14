/**
 * WorkoutStats.ts
 * Pure functions only — same rule as MetabolicEngine.ts: no Zustand, no
 * React, no I/O, so this can be unit-tested directly. These were originally
 * written inline in useFitPulseStore.ts, but importing that module in a test
 * drags in @react-native-async-storage/async-storage's native binding, which
 * throws outside a real RN runtime ("NativeModule: AsyncStorage is null") —
 * jest-expo doesn't mock it by default. Splitting the math out here keeps
 * this file testable the same no-mocks way as MetabolicEngine.test.ts, and
 * keeps the store as thin persistence + wiring on top of it.
 */

/** Rounds to the nearest multiple of `step` (e.g. nearest 2.5kg plate),
 *  clearing floating-point drift like 77.49999999999999. Used by the
 *  weight stepper in ExerciseSheet.tsx (see Обновление 4, HANDOFF.md). */
export function roundToStep(value: number, step: number): number {
  return Math.round(Math.round(value / step) * step * 100) / 100;
}

export interface SetLogEntry {
  id: string;
  exerciseId: number;
  dateKey: string; // YYYY-MM-DD, local calendar day
  weight: number;
  reps: number;
  rir: number;
}

/** dateKey -> exerciseId -> number of sets completed that day. */
export type DayProgress = Record<string, Record<number, number>>;

/** Local calendar day key (not UTC — two users in different timezones
 *  shouldn't see "today" roll over at the wrong wall-clock hour). */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const WEEKDAY_RU_SHORT = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

export function weekdayRuShort(date: Date): string {
  return WEEKDAY_RU_SHORT[date.getDay()];
}

/** Last `days` calendar days ending today, oldest first. */
export function lastNDays(days: number, now: Date = new Date()): Date[] {
  const out: Date[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    out.push(d);
  }
  return out;
}

/**
 * All-time best (heaviest) weight logged for an exercise, or across all
 * exercises if `exerciseId` is omitted, computed from `setLogs` directly.
 *
 * Note: since `pruneOldSetLogs` (below) keeps `setLogs` to a rolling
 * window, not full history, this only reflects "best within whatever
 * window setLogs currently holds" — for the real all-time record, read
 * the store's `personalRecords` map instead (updated incrementally on
 * every recordSet, so it never forgets a record just because the raw set
 * behind it aged out). This function stays useful for anything that
 * genuinely wants "best in the retained window" and is still exercised by
 * its own tests below.
 */
export function selectPersonalRecord(setLogs: SetLogEntry[], exerciseId?: number): number | null {
  const relevant = exerciseId === undefined ? setLogs : setLogs.filter((e) => e.exerciseId === exerciseId);
  if (relevant.length === 0) return null;
  return Math.max(...relevant.map((e) => e.weight));
}

/**
 * All-time best weight across every exercise, from the store's running
 * `personalRecords` map — the actual source of truth for "personal
 * record", independent of how much raw set history is still retained.
 */
export function selectOverallPersonalRecord(personalRecords: Record<number, number>): number | null {
  const values = Object.values(personalRecords);
  return values.length ? Math.max(...values) : null;
}

/**
 * Drops setLogs older than `retentionDays`. Exists because the store used
 * to persist every set ever logged, forever, re-serializing the whole
 * array to AsyncStorage on every single new set — fine at first, but the
 * payload (and the JSON.stringify cost) only grows, never shrinks, across
 * months of real use. Safe to prune aggressively because it never loses a
 * personal record: `personalRecords` in the store is updated the moment
 * each set is recorded, not derived from this array, so a record survives
 * long after the raw set behind it has been pruned. Only per-set detail
 * (exact reps/RIR on a specific day) is what ages out.
 */
export function pruneOldSetLogs(setLogs: SetLogEntry[], retentionDays: number, now: Date = new Date()): SetLogEntry[] {
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - retentionDays);
  const cutoffKey = toDateKey(cutoff);
  return setLogs.filter((e) => e.dateKey >= cutoffKey);
}

/**
 * Length of the current daily streak (consecutive days, ending today or
 * yesterday, where every exercise in `exercises` was fully completed).
 * Replaces WorkoutScreen's hardcoded "7 дней" + `[1,1,1,1,1,1,0]` ticks
 * (see HANDOFF.md) — the last hardcoded array left in the workout screens.
 * If today isn't finished yet, it doesn't break the streak by itself: the
 * count is taken through yesterday and today is reported separately via
 * `dayStatus` in selectStreakDays below, same as a habit-tracker convention
 * (today stays "in progress", not "missed", until the day is over).
 */
export function selectCurrentStreak(
  dayProgress: DayProgress,
  exercises: { id: number; totalSets: number }[],
  now: Date = new Date()
): number {
  const isComplete = (d: Date) => {
    const progress = dayProgress[toDateKey(d)];
    if (!progress) return false;
    return exercises.every((ex) => (progress[ex.id] ?? 0) >= ex.totalSets);
  };

  const cursor = new Date(now);
  if (!isComplete(cursor)) {
    cursor.setDate(cursor.getDate() - 1); // today not done (yet) — start counting from yesterday
  }

  let streak = 0;
  while (isComplete(cursor)) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export type DayStatus = 'done' | 'today-in-progress' | 'missed';

/** Per-day status for the last `days` days, oldest first — powers the
 *  streak tick row. 'today-in-progress' only ever applies to the last
 *  (most recent) entry. */
export function selectStreakDays(
  dayProgress: DayProgress,
  exercises: { id: number; totalSets: number }[],
  days = 7,
  now: Date = new Date()
): DayStatus[] {
  const window = lastNDays(days, now);
  const todayKey = toDateKey(now);
  return window.map((d) => {
    const progress = dayProgress[toDateKey(d)];
    const complete = Boolean(progress) && exercises.every((ex) => (progress![ex.id] ?? 0) >= ex.totalSets);
    if (complete) return 'done';
    return toDateKey(d) === todayKey ? 'today-in-progress' : 'missed';
  });
}

/** Russian pluralization for "день/дня/дней" — 1 день, 2–4 дня, 5+ дней,
 *  with the 11–14 exception (11 дней, not 11 день). */
export function ruDayWord(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'день';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'дня';
  return 'дней';
}

export interface DayVolume {
  dateKey: string;
  label: string; // short RU weekday
  volumeKg: number; // sum of weight*reps across all logged sets that day
  pct: number; // relative to the max day in the window, 0–100
}

/**
 * Real replacement for ProgressScreen's old fixed `VOLUME` demo array
 * (see HANDOFF.md) — sums actual logged sets (weight × reps) per calendar
 * day over the last `days` days. If nothing has been logged yet every bar
 * is simply 0%, which is the honest state rather than a fake baseline.
 */
export function selectWeeklyVolume(setLogs: SetLogEntry[], days = 7, now: Date = new Date()): DayVolume[] {
  const window = lastNDays(days, now);
  const totals = new Map<string, number>();
  for (const entry of setLogs) {
    totals.set(entry.dateKey, (totals.get(entry.dateKey) ?? 0) + entry.weight * entry.reps);
  }

  const raw = window.map((d) => ({
    dateKey: toDateKey(d),
    label: weekdayRuShort(d),
    volumeKg: totals.get(toDateKey(d)) ?? 0
  }));

  const max = Math.max(1, ...raw.map((r) => r.volumeKg));
  return raw.map((r) => ({ ...r, pct: Math.round((r.volumeKg / max) * 100) }));
}

/**
 * How many of the last 7 calendar days had EVERY exercise in `exercises`
 * completed (completed sets ≥ that exercise's total sets). Replaces
 * WorkoutScreen's old `2 + doneCount` local-state hack, which bumped the
 * "выполнено на неделе" number as soon as a single exercise finished
 * instead of the full day's plan (see HANDOFF.md).
 */
export function selectWeekDaysFullyCompleted(
  dayProgress: DayProgress,
  exercises: { id: number; totalSets: number }[],
  days = 7,
  now: Date = new Date()
): number {
  const window = lastNDays(days, now);
  return window.filter((d) => {
    const progress = dayProgress[toDateKey(d)];
    if (!progress) return false;
    return exercises.every((ex) => (progress[ex.id] ?? 0) >= ex.totalSets);
  }).length;
}
