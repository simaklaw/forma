/**
 * «Последняя схема по группе мышц» (идея — fit_tracker, no-license, ideas-only):
 * при сборке своей тренировки подставляем схему из последнего дня, в котором
 * качали выбранную группу: упражнения, число подходов, средние повторы и вес.
 * Чистая логика без React/RN — знания об упражнениях подаются резолверами.
 */
import { MAX_CUSTOM_ITEMS, type CustomWorkoutItem } from './customWorkouts';

/** Минимальная форма записи подхода (структурный подтип SetLogEntry). */
export interface SchemeSetLog {
  exerciseId: number;
  dateKey: string;
  weight: number;
  reps: number;
}

/** Внешние знания об упражнениях; без них схема собирается по fallback-значениям. */
export interface SchemeResolvers {
  /** Целевые мышцы упражнения; null/undefined — определение неизвестно. */
  musclesOf: (exerciseId: number) => readonly string[] | null | undefined;
  /** Отдых из определения упражнения; null/undefined — 60 с. */
  restOf?: (exerciseId: number) => number | null | undefined;
  /** Упражнение со свободным весом (для «свой вес» фикс веса не пишем). */
  isWeighted?: (exerciseId: number) => boolean;
}

export interface LastScheme {
  /** dateKey последнего дня, в котором качали выбранную группу. */
  dateKey: string;
  /** Схема всего того дня (не только выбранной группы), порядок — по факту логов. */
  items: CustomWorkoutItem[];
}

const DEFAULT_REST_SECONDS = 60;

function clampInt(value: number, min: number, max: number, dflt: number): number {
  if (!Number.isFinite(value)) return dflt;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((acc, v) => acc + v, 0) / values.length;
}

/**
 * Последняя схема по группе мышц: находит последний dateKey, где в логах есть
 * упражнение с этой группой, и собирает ВСЕ упражнения того дня (схема —
 * тренировка целиком: день «жим» включает и трицепс). Подходы — по числу
 * логов, повторы и вес — средние; вес пишем только упражнениям со свободным
 * весом. null — группа ещё не качалась или день пустой.
 */
export function lastSchemeForMuscle(
  setLogs: readonly SchemeSetLog[],
  muscle: string,
  resolvers: SchemeResolvers
): LastScheme | null {
  let latestDate: string | null = null;
  for (const log of setLogs) {
    const muscles = resolvers.musclesOf(log.exerciseId);
    if (!muscles || !muscles.includes(muscle)) continue;
    if (latestDate === null || log.dateKey > latestDate) {
      latestDate = log.dateKey;
    }
  }
  if (latestDate === null) return null;

  const order: number[] = [];
  const logsByExercise = new Map<number, SchemeSetLog[]>();
  for (const log of setLogs) {
    if (log.dateKey !== latestDate) continue;
    let bucket = logsByExercise.get(log.exerciseId);
    if (!bucket) {
      bucket = [];
      logsByExercise.set(log.exerciseId, bucket);
      order.push(log.exerciseId);
    }
    bucket.push(log);
  }

  const items: CustomWorkoutItem[] = [];
  for (const exerciseId of order) {
    const logs = logsByExercise.get(exerciseId) ?? [];
    const restRaw = resolvers.restOf?.(exerciseId);
    const item: CustomWorkoutItem = {
      exerciseId,
      sets: clampInt(logs.length, 1, 20, 1),
      reps: clampInt(average(logs.map((l) => l.reps)), 1, 100, 10),
      restSeconds: clampInt(
        typeof restRaw === 'number' ? restRaw : DEFAULT_REST_SECONDS,
        15,
        600,
        DEFAULT_REST_SECONDS
      )
    };
    const weighted = resolvers.isWeighted?.(exerciseId) ?? true;
    const weightAvg = average(logs.map((l) => l.weight));
    if (weighted && weightAvg > 0) {
      item.weightKg = Math.round(weightAvg * 10) / 10;
    }
    items.push(item);
    if (items.length >= MAX_CUSTOM_ITEMS) break;
  }
  if (items.length === 0) return null;
  return { dateKey: latestDate, items };
}

/** dateKey (YYYY-MM-DD) → DD.MM.YYYY для подписи «из истории». */
export function formatSchemeDate(dateKey: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  return match ? match[3] + '.' + match[2] + '.' + match[1] : dateKey;
}
