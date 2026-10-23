/**
 * StatsUtils — чистые статистические функции без зависимостей.
 * Порт из whoop-mcp by Shashank Mishra (MIT), файл src/tools/stats-utils.ts:
 * https://github.com/shashankswe2020-ux/whoop-mcp
 *
 * Все функции работают с массивами чисел; пустой массив бросает ошибку.
 * NaN не распространяется: краевые случаи возвращают определённые значения.
 */

function assertNonEmpty(values: number[], name: string): void {
  if (values.length === 0) {
    throw new Error(`${name}: cannot operate on an empty array`);
  }
}

/** P-й персентиль с линейной интерполяцией между соседними наблюдениями. */
export function percentile(values: number[], percent: number): number {
  assertNonEmpty(values, "percentile");
  if (
    !Number.isFinite(percent) ||
    percent < 0 ||
    percent > 100 ||
    values.some((value) => !Number.isFinite(value))
  ) {
    throw new RangeError("Percentile requires finite observations and a percentage from 0 to 100.");
  }
  const sorted = [...values].sort((left, right) => left - right);
  const position = ((sorted.length - 1) * percent) / 100;
  const lower = Math.floor(position);
  return sorted[lower]! + (sorted[Math.ceil(position)]! - sorted[lower]!) * (position - lower);
}

/**
 * Окружная статистика для «времён суток» в минутах (0–1440).
 * Среднее через единичный круг: полночь не разрывает ось (23:00 и 01:00 → 00:00).
 */
export function circularStats(minutes: number[]): { mean: number | null; sd: number | null } {
  if (!minutes.length) return { mean: null, sd: null };
  if (minutes.some((value) => !Number.isFinite(value)))
    throw new RangeError("Clock times must be finite.");
  const radians = minutes.map((value) => (value * Math.PI) / 720);
  const cosine = mean(radians.map(Math.cos));
  const sine = mean(radians.map(Math.sin));
  const length = Math.min(1, Math.hypot(cosine, sine));
  if (length < 1e-10) return { mean: null, sd: null };
  return {
    mean: ((Math.atan2(sine, cosine) * 720) / Math.PI + 1440) % 1440,
    sd: (Math.sqrt(-2 * Math.log(length)) * 720) / Math.PI,
  };
}

/** Среднее арифметическое. Бросает ошибку на пустом массиве. */
export function mean(values: number[]): number {
  assertNonEmpty(values, "mean");
  let sum = 0;
  for (const v of values) {
    sum += v;
  }
  return sum / values.length;
}

/** Медиана; при чётной длине — среднее двух средних. Вход не мутируется. */
export function median(values: number[]): number {
  assertNonEmpty(values, "median");
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1]! + sorted[mid]!) / 2;
  }
  return sorted[mid]!;
}

/** Популяционное стандартное отклонение. 0 для одного значения или константы. */
export function standardDeviation(values: number[]): number {
  assertNonEmpty(values, "standardDeviation");
  if (values.length === 1) {
    return 0;
  }
  const avg = mean(values);
  let sumSquaredDiffs = 0;
  for (const v of values) {
    const diff = v - avg;
    sumSquaredDiffs += diff * diff;
  }
  return Math.sqrt(sumSquaredDiffs / values.length);
}

export interface LinearRegressionResult {
  /** Наклон на единицу индекса. */
  slope: number;
  /** R² — качество аппроксимации (0–1). */
  r2: number;
}

/**
 * Простая линейная регрессия по значениям с индексами 0, 1, 2, …
 * Одно значение или константа дают { slope: 0, r2: 0 }.
 * Бросает ошибку на пустом массиве.
 */
export function linearRegression(values: number[]): LinearRegressionResult {
  assertNonEmpty(values, "linearRegression");
  const n = values.length;

  if (n === 1) {
    return { slope: 0, r2: 0 };
  }

  const sumX = (n * (n - 1)) / 2;
  const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

  let sumY = 0;
  let sumXY = 0;
  for (let i = 0; i < n; i++) {
    sumY += values[i]!;
    sumXY += i * values[i]!;
  }

  const denominator = n * sumX2 - sumX * sumX;
  if (denominator === 0) {
    return { slope: 0, r2: 0 };
  }

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  const yMean = sumY / n;
  let ssTot = 0;
  let ssRes = 0;
  for (let i = 0; i < n; i++) {
    const diff = values[i]! - yMean;
    ssTot += diff * diff;
    const predicted = intercept + slope * i;
    const residual = values[i]! - predicted;
    ssRes += residual * residual;
  }

  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;

  return { slope, r2 };
}

export interface Anomaly {
  /** Индекс в исходном массиве. */
  index: number;
  /** Аномальное значение. */
  value: number;
  /** Число стандартных отклонений от среднего. */
  deviation: number;
}

/**
 * Поиск значений дальше threshold сигм от среднего (по умолчанию 2σ).
 * Для константы или одного значения аномалий нет.
 * Бросает ошибку на пустом массиве.
 */
export function detectAnomalies(values: number[], threshold: number = 2): Anomaly[] {
  assertNonEmpty(values, "detectAnomalies");

  const avg = mean(values);
  const stdDev = standardDeviation(values);

  if (stdDev === 0) {
    return [];
  }

  const anomalies: Anomaly[] = [];
  for (let i = 0; i < values.length; i++) {
    const deviation = Math.abs(values[i]! - avg) / stdDev;
    if (deviation > threshold) {
      anomalies.push({ index: i, value: values[i]!, deviation });
    }
  }

  return anomalies;
}

/** Классификация направления тренда. */
export type TrendDirectionResult = "improving" | "declining" | "stable";

/**
 * Классифицирует тренд по наклону и R².
 *
 * Пороги R² (как в whoop-mcp):
 * - ≤ 0.4 — низкая уверенность → всегда "stable";
 * - > 0.4 — достаточно уверенности → знак наклона.
 *
 * Почти нулевой наклон (|slope| < 0.001) — всегда "stable".
 */
export function trendDirection(slope: number, r2: number): TrendDirectionResult {
  if (r2 <= 0.4) {
    return "stable";
  }

  if (Math.abs(slope) < 0.001) {
    return "stable";
  }

  return slope > 0 ? "improving" : "declining";
}
