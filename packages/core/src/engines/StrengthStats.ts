/**
 * StrengthStats — оценка 1ПМ по Эпли и тренды силы по 30-дневным окнам.
 * Порт концепции OneRepMaxChart из Snouzy/workout-cool (MIT): без UI, чистая логика.
 */
import { toDateKey, type SetLogEntry } from "./WorkoutStats.ts";

/** Epley 1RM estimate, округление до 0.1 кг. 0 для невалидных и bodyweight логов. */
export function estimateOneRepMax(weightKg: number, reps: number): number {
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
}

const DAY_MS = 24 * 60 * 60 * 1000;

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
  }

  const byExercise = new Map<number, Acc>();
  for (const log of setLogs) {
    const { weight, reps, dateKey } = log;
    if (!Number.isFinite(weight) || !Number.isFinite(reps) || weight <= 0 || reps <= 0) {
      continue;
    }
    const oneRm = estimateOneRepMax(weight, reps);
    const acc =
      byExercise.get(log.exerciseId) ??
      { best: 0, current: 0, previous: 0, hasPrevious: false, volume: 0, sets: 0 };
    acc.best = Math.max(acc.best, oneRm);
    acc.volume += weight * reps;
    acc.sets += 1;
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
    }))
    .sort((a, b) => b.bestOneRmKg - a.bestOneRmKg || a.exerciseId - b.exerciseId);
}
