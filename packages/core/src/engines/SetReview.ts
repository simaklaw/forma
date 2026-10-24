/**
 * SetReview — разбор подходов тренировочного дня по сценариям: разминка,
 * рабочие/тяжёлые/в отказ, лёгкие и «добивка на остатке».
 * По мотивам идеи set scenarios из открытой аналитики LiftShift;
 * реализация собственная, AGPL-код LiftShift не используется.
 */
import { type SetLogEntry } from "./WorkoutStats.ts";

/** Сценарий подхода внутри тренировочного дня. */
export type SetScenario = "warmup" | "easy" | "productive" | "grinder" | "failure" | "backoff";

/** Оценка одного подхода. */
export interface SetVerdict {
  /** Номер подхода в упражнении за день (0-based, в порядке логов). */
  index: number;
  weight: number;
  reps: number;
  rir: number;
  scenario: SetScenario;
  /** Рабочий подход с пользой для прогрессии (разминка/лёгкий/добивка — нет). */
  effective: boolean;
}

/** Разбор подходов одного упражнения за день. */
export interface ExerciseSetReview {
  exerciseId: number;
  sets: SetVerdict[];
  totalSets: number;
  effectiveSets: number;
}

/** Разбор всех подходов одного тренировочного дня. */
export interface DaySetReview {
  dateKey: string;
  exercises: ExerciseSetReview[];
  totalSets: number;
  effectiveSets: number;
  /** Все рабочие подходы лёгкие (RIR >= EASY_RIR) — нагрузка занижена. */
  allEasy: boolean;
  /** Больше половины рабочих подходов в отказ — риск техники и восстановления. */
  excessiveFailure: boolean;
}

/** Разминка: вес ниже этой доли от топового веса упражнения за день. */
export const WARMUP_WEIGHT_RATIO = 0.7;
/** Лёгкий подход: RIR от этого значения и выше. */
export const EASY_RIR = 4;
/** «Добивка на остатке»: повторы не выше этой доли от лучших на том же весе. */
export const BACKOFF_REPS_RATIO = 0.5;
/** «Добивку» фиксируем только при достаточно больших подходах. */
export const BACKOFF_MIN_BEST_REPS = 6;

/** Сценарии, которые считаются эффективной рабочей нагрузкой. */
const WORKING_SCENARIOS: ReadonlySet<SetScenario> = new Set(["productive", "grinder", "failure"]);

function validEntry(entry: SetLogEntry): boolean {
  return (
    Number.isFinite(entry.reps) &&
    entry.reps > 0 &&
    Number.isFinite(entry.weight) &&
    entry.weight >= 0 &&
    Number.isFinite(entry.rir) &&
    entry.rir >= 0
  );
}

function verdictScenario(
  entry: SetLogEntry,
  topWeight: number,
  bestRepsAtWeight: number,
): SetScenario {
  // Явный тип из импорта (Hevy set_type) приоритетнее эвристики по весу/RIR.
  if (entry.setType === "warmup" || entry.setType === "failure") return entry.setType;
  if (entry.setType === "dropset") return "grinder";
  if (topWeight > 0 && entry.weight > 0 && entry.weight < WARMUP_WEIGHT_RATIO * topWeight) {
    return "warmup";
  }
  if (entry.rir === 0) return "failure";
  if (entry.rir === 1) return "grinder";
  if (
    bestRepsAtWeight >= BACKOFF_MIN_BEST_REPS &&
    entry.reps <= BACKOFF_REPS_RATIO * bestRepsAtWeight
  ) {
    return "backoff";
  }
  if (entry.rir >= EASY_RIR) return "easy";
  return "productive";
}

/**
 * Разбор подходов за дату dateKey: сценарии по RIR и весу относительно
 * топового веса упражнения за день; «добивка» — провал повторов на том же весе.
 * Разминка исключается из оценок «все лёгкие» и «слишком много отказов».
 */
export function daySetReview(setLogs: SetLogEntry[], dateKey: string): DaySetReview {
  const byExercise = new Map<number, SetLogEntry[]>();
  for (const entry of setLogs) {
    if (entry.dateKey !== dateKey || !validEntry(entry)) continue;
    const list = byExercise.get(entry.exerciseId);
    if (list) {
      list.push(entry);
    } else {
      byExercise.set(entry.exerciseId, [entry]);
    }
  }

  const exercises: ExerciseSetReview[] = [];
  let totalSets = 0;
  let effectiveSets = 0;
  let workingTotal = 0;
  let workingEasy = 0;
  let workingFailure = 0;

  for (const [exerciseId, logs] of byExercise) {
    const topWeight = logs.reduce((acc, e) => Math.max(acc, e.weight), 0);
    const bestRepsByWeight = new Map<number, number>();
    for (const e of logs) {
      bestRepsByWeight.set(e.weight, Math.max(bestRepsByWeight.get(e.weight) ?? 0, e.reps));
    }
    const sets: SetVerdict[] = logs.map((entry, index) => {
      const scenario = verdictScenario(
        entry,
        topWeight,
        bestRepsByWeight.get(entry.weight) ?? entry.reps,
      );
      return {
        index,
        weight: entry.weight,
        reps: entry.reps,
        rir: entry.rir,
        scenario,
        effective: WORKING_SCENARIOS.has(scenario),
      };
    });
    const exEffective = sets.filter((s) => s.effective).length;
    exercises.push({ exerciseId, sets, totalSets: sets.length, effectiveSets: exEffective });
    totalSets += sets.length;
    effectiveSets += exEffective;
    for (const s of sets) {
      if (s.scenario === "warmup") continue;
      workingTotal += 1;
      if (s.scenario === "easy") {
        workingEasy += 1;
      } else if (s.scenario === "failure") {
        workingFailure += 1;
      }
    }
  }

  return {
    dateKey,
    exercises,
    totalSets,
    effectiveSets,
    allEasy: workingTotal >= 2 && workingEasy === workingTotal,
    excessiveFailure: workingTotal >= 3 && workingFailure * 2 > workingTotal,
  };
}
