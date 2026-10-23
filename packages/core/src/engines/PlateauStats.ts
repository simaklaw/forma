/**
 * PlateauStats — статусы упражнений (рост / плато / застой / просадка)
 * и рекомендация на следующую тренировку.
 * По мотивам открытой аналитики LiftShift (концепция статуса + совета);
 * реализация собственная: e1RM Эпли + линейная регрессия по последним сессиям.
 */
import { estimateEpleyOneRm } from "./StrengthStats.ts";
import { linearRegression, mean } from "./StatsUtils.ts";
import type { SetLogEntry } from "./WorkoutStats.ts";

/** Статус упражнения по фактическим логам. */
export type ExerciseStatus =
  | "growing"
  | "plateau"
  | "static_plateau"
  | "dipping"
  | "insufficient_data";

/** Уверенность в статусе: растёт с числом записанных сессий. */
export type StatusConfidence = "low" | "medium" | "high";

/** Конкретное действие на следующую тренировку. */
export type StatusSuggestion =
  | "keep_pushing"
  | "add_rep_or_weight"
  | "change_scheme"
  | "check_recovery"
  | "log_more";

export interface PlateauAnalysis {
  exerciseId: number;
  status: ExerciseStatus;
  confidence: StatusConfidence;
  /** Число тренировочных дней с валидными логами (учтены последние 12). */
  sessionCount: number;
  /** Лучший e1RM последней сессии; 0 при отсутствии валидных логов. */
  latestOneRmKg: number;
  /** Наклон e1RM по последним сессиям в долях от среднего (за сессию); null при малом числе данных. */
  relativeSlope: number | null;
  suggestion: StatusSuggestion;
}

/** Учитываем последние 12 сессий упражнения — более старая история не релевантна. */
const MAX_SESSIONS = 12;
/** Окно регрессии: последние сессии упражнения. */
const TREND_SESSIONS = 6;
/** Порог относительного наклона: ±0.5% за сессию. */
const REL_SLOPE_THRESHOLD = 0.005;

interface SessionPoint {
  dateKey: string;
  /** Максимальный вес сессии. */
  topWeightKg: number;
  /** Повторы в самом тяжёлом подходе сессии. */
  repsAtTopWeight: number;
  /** Лучший e1RM сессии. */
  bestOneRm: number;
}

/** Валидные логи одного упражнения, свёрнутые в хронологические точки по дням. */
function sessionPoints(logs: SetLogEntry[]): SessionPoint[] {
  const byDay = new Map<string, { topWeight: number; repsAtTop: number; best: number }>();
  for (const entry of logs) {
    const { weight, reps } = entry;
    if (!Number.isFinite(weight) || !Number.isFinite(reps) || weight <= 0 || reps <= 0) {
      continue;
    }
    const oneRm = estimateEpleyOneRm(weight, reps);
    const acc = byDay.get(entry.dateKey) ?? { topWeight: 0, repsAtTop: 0, best: 0 };
    if (weight > acc.topWeight) {
      acc.topWeight = weight;
      acc.repsAtTop = reps;
    } else if (weight === acc.topWeight && reps > acc.repsAtTop) {
      acc.repsAtTop = reps;
    }
    acc.best = Math.max(acc.best, oneRm);
    byDay.set(entry.dateKey, acc);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .slice(-MAX_SESSIONS)
    .map(([dateKey, acc]) => ({
      dateKey,
      topWeightKg: acc.topWeight,
      repsAtTopWeight: acc.repsAtTop,
      bestOneRm: acc.best,
    }));
}

function confidenceFor(sessionCount: number): StatusConfidence {
  if (sessionCount < 5) return "low";
  if (sessionCount < 9) return "medium";
  return "high";
}

/** Классификация по точкам сессий: застой → рост → просадка → плато. */
function classify(points: SessionPoint[]): Omit<PlateauAnalysis, "exerciseId"> {
  const sessionCount = points.length;
  const latestOneRmKg = points.length > 0 ? points[points.length - 1]!.bestOneRm : 0;
  if (sessionCount < 3) {
    return {
      status: "insufficient_data",
      confidence: confidenceFor(sessionCount),
      sessionCount,
      latestOneRmKg,
      relativeSlope: null,
      suggestion: "log_more",
    };
  }
  const recent = points.slice(-TREND_SESSIONS);
  const values = recent.map((p) => p.bestOneRm);
  const avg = mean(values);
  const { slope } = linearRegression(values);
  const relativeSlope = avg > 0 ? slope / avg : 0;

  const last3 = points.slice(-3);
  const frozen =
    last3.length === 3 &&
    last3.every((p) => p.topWeightKg === last3[0]!.topWeightKg) &&
    last3.every((p) => p.repsAtTopWeight === last3[0]!.repsAtTopWeight);
  if (frozen) {
    return {
      status: "static_plateau",
      confidence: confidenceFor(sessionCount),
      sessionCount,
      latestOneRmKg,
      relativeSlope,
      suggestion: "change_scheme",
    };
  }
  if (relativeSlope >= REL_SLOPE_THRESHOLD) {
    return {
      status: "growing",
      confidence: confidenceFor(sessionCount),
      sessionCount,
      latestOneRmKg,
      relativeSlope,
      suggestion: "keep_pushing",
    };
  }
  if (relativeSlope <= -REL_SLOPE_THRESHOLD) {
    return {
      status: "dipping",
      confidence: confidenceFor(sessionCount),
      sessionCount,
      latestOneRmKg,
      relativeSlope,
      suggestion: "check_recovery",
    };
  }
  return {
    status: "plateau",
    confidence: confidenceFor(sessionCount),
    sessionCount,
    latestOneRmKg,
    relativeSlope,
    suggestion: "add_rep_or_weight",
  };
}

/**
 * Статус и совет для каждого упражнения с валидными логами.
 * «Застой» — вес и повторы топового подхода буквально не менялись 3 сессии
 * (по мотивам LiftShift static plateau), «плато» — плоский тренд с вариацией.
 * Сортировка: больше сессий — выше в списке.
 */
export function plateauAnalyses(setLogs: SetLogEntry[]): PlateauAnalysis[] {
  const byExercise = new Map<number, SetLogEntry[]>();
  for (const entry of setLogs) {
    const list = byExercise.get(entry.exerciseId);
    if (list) {
      list.push(entry);
    } else {
      byExercise.set(entry.exerciseId, [entry]);
    }
  }
  const out: PlateauAnalysis[] = [];
  for (const [exerciseId, logs] of byExercise) {
    const points = sessionPoints(logs);
    if (points.length === 0) continue;
    out.push({ exerciseId, ...classify(points) });
  }
  return out.sort((a, b) => b.sessionCount - a.sessionCount || a.exerciseId - b.exerciseId);
}
