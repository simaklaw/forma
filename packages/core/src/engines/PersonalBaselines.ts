/**
 * PersonalBaselines — личные базлайны метрик: персентильные коридоры по истории наблюдений.
 * Порт паттерна get-baselines из whoop-mcp by Shashank Mishra (MIT):
 * https://github.com/shashankswe2020-ux/whoop-mcp
 *
 * Отличия от оригинала: без zod и сети; наблюдения приходят массивом
 * { value, dateKey }. Последнее наблюдение НЕ входит в базлайн (как в whoop-mcp),
 * чтобы «сегодня» оценивалось относительно собственной истории.
 */
import { mean, median, percentile, standardDeviation } from "./StatsUtils.ts";

/** Одно наблюдение метрики: значение + дата (YYYY-MM-DD). */
export interface BaselineObservation {
  value: number;
  dateKey: string;
}

/** Персентильный коридор личных значений метрики. */
export interface BaselineBand {
  sampleSize: number;
  mean: number;
  median: number;
  stdDev: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}

export type BaselineStatus = "available" | "insufficient_data";

export interface PersonalBaseline {
  status: BaselineStatus;
  /** Число наблюдений в базлайне (последний день исключён). */
  sampleSize: number;
  /** Сколько наблюдений отброшено: нечисловые значения и дубликаты дат. */
  excluded: number;
  /** Коридор; null при insufficient_data. */
  band: BaselineBand | null;
  /** Последнее наблюдение (по дате); null, если валидных наблюдений нет. */
  latest: number | null;
  /** Позиция последнего значения в базлайне, 0–100; null без базлайна. */
  latestPercentile: number | null;
  /** true, если все значения базлайна одинаковы (σ = 0). */
  constantBaseline: boolean;
}

/** Минимум наблюдений для базлайна (как в whoop-mcp). */
export const BASELINE_MIN_SAMPLES = 14;

export function personalBaseline(
  observations: BaselineObservation[],
  minSamples: number = BASELINE_MIN_SAMPLES,
): PersonalBaseline {
  let excluded = 0;
  const byDate = new Map<string, number>();
  for (const obs of observations) {
    const valid =
      obs != null &&
      typeof obs.dateKey === "string" &&
      obs.dateKey !== "" &&
      Number.isFinite(obs.value);
    if (!valid) {
      excluded += 1;
      continue;
    }
    if (byDate.has(obs.dateKey)) {
      excluded += 1; // дубликат даты — остаётся последнее значение
    }
    byDate.set(obs.dateKey, obs.value);
  }

  const sorted = [...byDate.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  if (sorted.length === 0) {
    return {
      status: "insufficient_data",
      sampleSize: 0,
      excluded,
      band: null,
      latest: null,
      latestPercentile: null,
      constantBaseline: false,
    };
  }

  const latest = sorted[sorted.length - 1]![1];
  const values = sorted.slice(0, -1).map(([, value]) => value);
  if (values.length < minSamples) {
    return {
      status: "insufficient_data",
      sampleSize: values.length,
      excluded,
      band: null,
      latest,
      latestPercentile: null,
      constantBaseline: false,
    };
  }

  const stdDev = standardDeviation(values);
  const below = values.filter((v) => v < latest).length;
  const equal = values.filter((v) => v === latest).length;

  return {
    status: "available",
    sampleSize: values.length,
    excluded,
    band: {
      sampleSize: values.length,
      mean: mean(values),
      median: median(values),
      stdDev,
      p10: percentile(values, 10),
      p25: percentile(values, 25),
      p50: percentile(values, 50),
      p75: percentile(values, 75),
      p90: percentile(values, 90),
    },
    latest,
    latestPercentile: (100 * (below + 0.5 * equal)) / values.length,
    constantBaseline: stdDev === 0,
  };
}
