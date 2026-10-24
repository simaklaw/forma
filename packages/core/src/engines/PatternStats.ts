/**
 * PatternStats — недельная нагрузка по паттернам движения и баланс жим/тяга.
 * По мотивам обзора каталога GymBells (концепция таксономии движений
 * squat / hinge / push / pull); таксономия — общеизвестная фитнес-концепция,
 * назначение паттернов и реализация собственные, код GymBells не используется.
 */
import { toDateKey, type SetLogEntry } from "./WorkoutStats.ts";

/** Канонический набор паттернов движения (ключи — строки, core UI-agnostic). */
export type MovementPattern =
  | "squat"
  | "hinge"
  | "push_horizontal"
  | "push_vertical"
  | "pull_horizontal"
  | "pull_vertical"
  | "core"
  | "isolation";

export interface PatternVolumeStat {
  pattern: string;
  /** Рабочие подходы паттерна за окно (разминка не считается). */
  weeklySets: number;
  /** Тоннаж (вес × повторы) подходов паттерна за окно. */
  volumeKg: number;
  /** Число тренировочных дней окна, где паттерн работал. */
  sessionDays: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Bodyweight-логи (weight 0) — валидная нагрузка; разминка (setType) — нет. */
function validEntry(entry: SetLogEntry): boolean {
  if (entry.setType === "warmup") return false;
  return (
    Number.isFinite(entry.reps) &&
    entry.reps > 0 &&
    Number.isFinite(entry.weight) &&
    entry.weight >= 0
  );
}

/**
 * Недельная нагрузка по паттернам движения (windowDays до now).
 * exercisePatterns: exerciseId → паттерн, ровно один на упражнение.
 * Сортировка: больше подходов — выше, при равенстве — по алфавиту.
 */
export function patternVolumeStats(
  setLogs: SetLogEntry[],
  exercisePatterns: Record<number, string>,
  now: Date = new Date(),
  windowDays = 7,
): PatternVolumeStat[] {
  const cutoff = toDateKey(new Date(now.getTime() - (windowDays - 1) * DAY_MS));

  interface Acc {
    weeklySets: number;
    volumeKg: number;
    days: Set<string>;
  }
  const byPattern = new Map<string, Acc>();
  for (const entry of setLogs) {
    if (!validEntry(entry)) continue;
    if (entry.dateKey < cutoff) continue;
    const pattern = exercisePatterns[entry.exerciseId];
    if (!pattern) continue;
    const acc = byPattern.get(pattern) ?? {
      weeklySets: 0,
      volumeKg: 0,
      days: new Set<string>(),
    };
    acc.weeklySets += 1;
    acc.volumeKg += entry.weight * entry.reps;
    acc.days.add(entry.dateKey);
    byPattern.set(pattern, acc);
  }

  return [...byPattern.entries()]
    .map(([pattern, acc]) => ({
      pattern,
      weeklySets: acc.weeklySets,
      volumeKg: Math.round(acc.volumeKg * 10) / 10,
      sessionDays: acc.days.size,
    }))
    .sort((a, b) => b.weeklySets - a.weeklySets || (a.pattern < b.pattern ? -1 : 1));
}

/** Статус баланса жим/тяга. */
export type PushPullStatus = "balanced" | "push_heavy" | "pull_heavy" | "none";

export interface PushPullBalance {
  pushSets: number;
  pullSets: number;
  /** push / pull; null, когда за окно нет ни жимов, ни тяг. */
  ratio: number | null;
  status: PushPullStatus;
}

/** Границы нормы: тяга от 2/3 до 1.5 × жим. */
const BALANCE_LOW = 2 / 3;
const BALANCE_HIGH = 1.5;

/**
 * Баланс жимов и тяг по данным patternVolumeStats.
 * push = push_horizontal + push_vertical, pull = pull_horizontal + pull_vertical.
 */
export function pushPullBalance(stats: PatternVolumeStat[]): PushPullBalance {
  const setsOf = (pattern: string): number =>
    stats.find((s) => s.pattern === pattern)?.weeklySets ?? 0;
  const pushSets = setsOf("push_horizontal") + setsOf("push_vertical");
  const pullSets = setsOf("pull_horizontal") + setsOf("pull_vertical");
  if (pushSets === 0 && pullSets === 0) {
    return { pushSets: 0, pullSets: 0, ratio: null, status: "none" };
  }
  const ratio = pullSets === 0 ? Infinity : pushSets / pullSets;
  const status: PushPullStatus =
    ratio >= BALANCE_LOW && ratio <= BALANCE_HIGH
      ? "balanced"
      : ratio > BALANCE_HIGH
        ? "push_heavy"
        : "pull_heavy";
  return { pushSets, pullSets, ratio, status };
}
