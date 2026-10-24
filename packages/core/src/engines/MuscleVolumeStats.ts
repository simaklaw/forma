/**
 * MuscleVolumeStats — недельная нагрузка по мышцам: MEV/MRV и junk volume.
 * По мотивам открытой аналитики LiftShift (концепция недельного объёма по
 * мышечным группам и junk volume); реализация собственная, AGPL-код не используется.
 * Ключи мышц — строки: core не зависит от мобильных типов MuscleKey.
 */
import { toDateKey, type SetLogEntry } from "./WorkoutStats.ts";

/** Статус недельной нагрузки мышцы: недобор / оптимум / junk volume. */
export type MuscleLoadStatus = "under" | "optimal" | "junk";

export interface MuscleVolumeStat {
  muscle: string;
  /** Взвешенные подходы за окно: основная мышца — 1, синергисты — 0.5. */
  weeklySets: number;
  /** Подходы, где мышца — основная (первая в списке упражнения). */
  directSets: number;
  /** Тоннаж (вес × повторы) подходов на мышцу за окно. */
  volumeKg: number;
  /** Число тренировочных дней окна, где мышца работала. */
  sessionDays: number;
  /** Минимальный эффективный объём (сетов в неделю). */
  mev: number;
  /** Максимальный восстанавливаемый объём (сетов в неделю). */
  mrv: number;
  status: MuscleLoadStatus;
}

/** MEV/MRV по умолчанию: классические ориентиры 10/20 жёстких сетов в неделю. */
export const DEFAULT_MEV = 10;
export const DEFAULT_MRV = 20;
/** Вес синергиста во взвешенных подходах (основная мышца = 1). */
const SYNERGIST_WEIGHT = 0.5;

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
 * Недельная нагрузка по каждой мышце, встречающейся в окне (windowDays до now).
 * Статус: under — ниже MEV, junk — выше MRV, иначе optimal.
 * Сортировка: больше взвешенных подходов — выше.
 */
export function muscleVolumeStats(
  setLogs: SetLogEntry[],
  exerciseMuscles: Record<number, readonly string[]>,
  now: Date = new Date(),
  windowDays = 7,
  mev: number = DEFAULT_MEV,
  mrv: number = DEFAULT_MRV,
): MuscleVolumeStat[] {
  const cutoff = toDateKey(new Date(now.getTime() - (windowDays - 1) * DAY_MS));

  interface Acc {
    weeklySets: number;
    directSets: number;
    volumeKg: number;
    days: Set<string>;
  }
  const byMuscle = new Map<string, Acc>();
  for (const entry of setLogs) {
    if (!validEntry(entry)) continue;
    if (entry.dateKey < cutoff) continue;
    const muscles = exerciseMuscles[entry.exerciseId];
    if (!muscles || muscles.length === 0) continue;
    muscles.forEach((muscle, index) => {
      const acc =
        byMuscle.get(muscle) ??
        { weeklySets: 0, directSets: 0, volumeKg: 0, days: new Set<string>() };
      if (index === 0) {
        acc.weeklySets += 1;
        acc.directSets += 1;
      } else {
        acc.weeklySets += SYNERGIST_WEIGHT;
      }
      acc.volumeKg += entry.weight * entry.reps;
      acc.days.add(entry.dateKey);
      byMuscle.set(muscle, acc);
    });
  }

  return [...byMuscle.entries()]
    .map(([muscle, acc]) => {
      const weeklySets = Math.round(acc.weeklySets * 2) / 2;
      const status: MuscleLoadStatus =
        weeklySets < mev ? "under" : weeklySets <= mrv ? "optimal" : "junk";
      return {
        muscle,
        weeklySets,
        directSets: acc.directSets,
        volumeKg: Math.round(acc.volumeKg * 10) / 10,
        sessionDays: acc.days.size,
        mev,
        mrv,
        status,
      };
    })
    .sort((a, b) => b.weeklySets - a.weeklySets || (a.muscle < b.muscle ? -1 : 1));
}
