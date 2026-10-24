/**
 * StrengthStats — оценка 1ПМ по Эпли и тренды силы по 30-дневным окнам.
 * Порт концепции OneRepMaxChart из Snouzy/workout-cool (MIT): без UI, чистая логика.
 * Классификация тренда — линейная регрессия с порогом R² (порт из whoop-mcp, MIT).
 */
import { toDateKey, type SetLogEntry } from "./WorkoutStats.ts";
import { linearRegression, trendDirection, type TrendDirectionResult } from "./StatsUtils.ts";

/** Epley 1RM estimate, округление до 0.1 кг. 0 для невалидных и bodyweight логов. */
export function estimateEpleyOneRm(weightKg: number, reps: number): number {
  if (!Number.isFinite(weightKg) || !Number.isFinite(reps)) return 0;
  if (weightKg <= 0 || reps <= 0) return 0;
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10;
}

export interface StrengthTrend {
  exerciseId: number;
  /** Лучший e1RM за всю историю упражнения. */
  bestOneRmKg: number;
  /** Лучший e1RM в текущем окне (windowDays до now); 0, если текущих логов нет. */
  currentOneRmKg: number;
  /** Лучший e1RM в предыдущем окне; null, если предыдущих логов нет. */
  previousOneRmKg: number | null;
  /** current − previous (округлено до 0.1); null без предыдущего окна. */
  deltaKg: number | null;
  /** Суммарный объём (вес × повторы) по учтённым логам. */
  totalVolumeKg: number;
  /** Число учтённых подходов (bodyweight-логи с weight 0 не считаются). */
  setCount: number;
  /** Тренд дневных лучших e1RM (регрессия + порог R²); null при < 3 тренировочных днях. */
  trend: TrendDirectionResult | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Регрессия по дневным лучшим e1RM в хронологическом порядке по dateKey. */
function classifyDailyTrend(daily: Map<string, number>): TrendDirectionResult | null {
  if (daily.size < 3) return null;
  const values = [...daily.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([, value]) => value);
  const { slope, r2 } = linearRegression(values);
  return trendDirection(slope, r2);
}

export function strengthTrends(
  setLogs: SetLogEntry[],
  now: Date = new Date(),
  windowDays = 30,
): StrengthTrend[] {
  const currentStart = toDateKey(new Date(now.getTime() - (windowDays - 1) * DAY_MS));
  const previousStart = toDateKey(new Date(now.getTime() - (2 * windowDays - 1) * DAY_MS));

  interface Acc {
    best: number;
    current: number;
    previous: number;
    hasPrevious: boolean;
    volume: number;
    sets: number;
    daily: Map<string, number>;
  }

  const byExercise = new Map<number, Acc>();
  for (const log of setLogs) {
    const { weight, reps, dateKey } = log;
    if (!Number.isFinite(weight) || !Number.isFinite(reps) || weight <= 0 || reps <= 0) {
      continue;
    }
    const oneRm = estimateEpleyOneRm(weight, reps);
    const acc =
      byExercise.get(log.exerciseId) ??
      {
        best: 0,
        current: 0,
        previous: 0,
        hasPrevious: false,
        volume: 0,
        sets: 0,
        daily: new Map<string, number>(),
      };
    acc.best = Math.max(acc.best, oneRm);
    acc.volume += weight * reps;
    acc.sets += 1;
    acc.daily.set(dateKey, Math.max(acc.daily.get(dateKey) ?? 0, oneRm));
    if (dateKey >= currentStart) {
      acc.current = Math.max(acc.current, oneRm);
    } else if (dateKey >= previousStart) {
      acc.previous = Math.max(acc.previous, oneRm);
      acc.hasPrevious = true;
    }
    byExercise.set(log.exerciseId, acc);
  }

  return [...byExercise.entries()]
    .map(([exerciseId, acc]) => ({
      exerciseId,
      bestOneRmKg: acc.best,
      currentOneRmKg: acc.current,
      previousOneRmKg: acc.hasPrevious ? acc.previous : null,
      deltaKg: acc.hasPrevious ? Math.round((acc.current - acc.previous) * 10) / 10 : null,
      totalVolumeKg: Math.round(acc.volume * 10) / 10,
      setCount: acc.sets,
      trend: classifyDailyTrend(acc.daily),
    }))
    .sort((a, b) => b.bestOneRmKg - a.bestOneRmKg || a.exerciseId - b.exerciseId);
}

export interface E1RmDailyPoint {
  dateKey: string;
  /** Лучший e1RM тренировочного дня, кг (Эпли). */
  oneRmKg: number;
}

/**
 * Временной ряд e1RM одного упражнения: лучший e1RM каждого тренировочного
 * дня в хронологическом порядке. Разминочные подходы (setType "warmup") и
 * bodyweight-логи не учитываются.
 */
export function e1RmDailyBests(setLogs: SetLogEntry[], exerciseId: number): E1RmDailyPoint[] {
  const byDay = new Map<string, number>();
  for (const log of setLogs) {
    if (log.exerciseId !== exerciseId) continue;
    if (log.setType === "warmup") continue;
    const oneRm = estimateEpleyOneRm(log.weight, log.reps);
    if (oneRm <= 0) continue;
    byDay.set(log.dateKey, Math.max(byDay.get(log.dateKey) ?? 0, oneRm));
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([dateKey, oneRmKg]) => ({ dateKey, oneRmKg }));
}
