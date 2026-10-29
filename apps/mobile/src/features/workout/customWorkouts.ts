/**
 * Custom Workouts (P0, clean-room по мотивам разбора Fitify Pro):
 * пользовательские тренировки — сохранённые списки упражнений из планов
 * (gym/home) и импортированной библиотеки. Запускаются через обычный session
 * engine как «день» с id `custom-<workoutId>` (см. ActiveSessionController).
 *
 * Чистая логика без React/RN — нормализация, разрешение в ExerciseDef[] и т.п.
 */
import type { ExerciseDef } from './ExerciseSheet';
import type { WorkoutDay } from './catalog';
import { catalogExerciseById } from './dayPlanOverrides';

export interface CustomWorkoutItem {
  exerciseId: number;
  sets: number;
  /** Повторы (или секунды для measure='seconds'). */
  reps: number;
  restSeconds: number;
  /** Опциональный фикс рабочего веса; иначе вес из базового определения. */
  weightKg?: number;
  /** Суперсет с предыдущим элементом (подходы по кругу). */
  supersetWithPrev?: boolean;
}

export interface CustomWorkout {
  id: string;
  name: string;
  items: CustomWorkoutItem[];
  createdAtKey: string;
  updatedAtKey: string;
}

export const MAX_CUSTOM_WORKOUTS = 50;
export const MAX_CUSTOM_ITEMS = 30;

export const CUSTOM_DAY_PREFIX = 'custom-';

const CUSTOM_ID_RE = /^cw-[a-z0-9]{6,32}$/;
const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** dayId для session engine: `custom-<workoutId>`. */
export function customDayId(workoutId: string): string {
  return CUSTOM_DAY_PREFIX + workoutId;
}

/** Обратное преобразование; null для обычных дней плана. */
export function customIdFromDayId(dayId: string): string | null {
  return dayId.startsWith(CUSTOM_DAY_PREFIX)
    ? dayId.slice(CUSTOM_DAY_PREFIX.length)
    : null;
}

/** Найти определение упражнения: gym → home → импортированная библиотека. */
export function customExerciseById(id: number): ExerciseDef | null {
  return catalogExerciseById('gym', id) ?? catalogExerciseById('home', id);
}

function clampInt(value: unknown, min: number, max: number, dflt: number): number {
  const n = typeof value === 'number' ? value : NaN;
  if (!Number.isFinite(n)) return dflt;
  return Math.min(max, Math.max(min, Math.round(n)));
}

/** Оборонительная нормализация элементов: мусор выбрасываем, числа зажимаем. */
export function normalizeCustomItems(value: unknown): CustomWorkoutItem[] {
  if (!Array.isArray(value)) return [];
  const out: CustomWorkoutItem[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== 'object') continue;
    const r = raw as Record<string, unknown>;
    const exerciseId =
      typeof r.exerciseId === 'number' && Number.isInteger(r.exerciseId) && r.exerciseId >= 1
        ? r.exerciseId
        : null;
    if (exerciseId == null) continue;
    const weightRaw = r.weightKg;
    const weightKg =
      typeof weightRaw === 'number' && Number.isFinite(weightRaw) && weightRaw > 0
        ? Math.round(weightRaw * 10) / 10
        : undefined;
    out.push({
      exerciseId,
      sets: clampInt(r.sets, 1, 20, 3),
      reps: clampInt(r.reps, 1, 100, 10),
      restSeconds: clampInt(r.restSeconds, 15, 600, 60),
      weightKg,
      // Суперсет имеет смысл только со второго элемента: первому некого «предыдущего».
      supersetWithPrev: out.length > 0 && r.supersetWithPrev === true ? true : undefined
    });
    if (out.length >= MAX_CUSTOM_ITEMS) break;
  }
  return out;
}

/** Имя: пробелы схлопываем, длину капим. '' допустимо («Без названия»). */
export function normalizeCustomWorkoutName(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, 40);
}

/** Полная нормализация списка тренировок (persisted-снапшот может быть битым). */
export function normalizeCustomWorkouts(
  value: unknown,
  fallbackDateKey = '2026-01-01'
): CustomWorkout[] {
  if (!Array.isArray(value)) return [];
  const out: CustomWorkout[] = [];
  const seen = new Set<string>();
  for (const raw of value) {
    if (!raw || typeof raw !== 'object') continue;
    const r = raw as Record<string, unknown>;
    const id =
      typeof r.id === 'string' && CUSTOM_ID_RE.test(r.id) ? r.id : null;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const createdAtKey =
      typeof r.createdAtKey === 'string' && DATE_KEY_RE.test(r.createdAtKey)
        ? r.createdAtKey
        : fallbackDateKey;
    const updatedAtKey =
      typeof r.updatedAtKey === 'string' && DATE_KEY_RE.test(r.updatedAtKey)
        ? r.updatedAtKey
        : createdAtKey;
    out.push({
      id,
      name: normalizeCustomWorkoutName(r.name),
      items: normalizeCustomItems(r.items),
      createdAtKey,
      updatedAtKey
    });
    if (out.length >= MAX_CUSTOM_WORKOUTS) break;
  }
  return out;
}

/** Разрешить элементы в ExerciseDef[]: неизвестные id пропускаем, index 1..n. */
export function resolveCustomWorkoutExercises(
  items: readonly CustomWorkoutItem[],
  findById: (id: number) => ExerciseDef | null
): ExerciseDef[] {
  const out: ExerciseDef[] = [];
  for (const item of items) {
    const base = findById(item.exerciseId);
    if (!base) continue;
    out.push({
      ...base,
      index: out.length + 1,
      totalSets: item.sets,
      workingReps: item.reps,
      restSeconds: item.restSeconds,
      workingWeight: item.weightKg ?? base.workingWeight,
      supersetWithPrev: item.supersetWithPrev === true ? true : undefined
    });
  }
  return out;
}

/** Грубая оценка длительности — та же формула, что в WorkoutPreviewSheet. */
export function estimateCustomWorkoutMinutes(defs: readonly ExerciseDef[]): number {
  return Math.round(defs.reduce((sec, ex) => sec + ex.totalSets * (ex.restSeconds + 45), 0) / 60);
}

/**
 * Виртуальный «день» для WorkoutScreen/session engine.
 * null, если ничего не разрешается (пустая тренировка или удалённые упражнения) —
 * экран откатывается к обычному плану.
 */
export function buildCustomWorkoutDay(
  workout: CustomWorkout,
  fallbackName: string,
  meta: string
): WorkoutDay | null {
  const exercises = resolveCustomWorkoutExercises(workout.items, customExerciseById);
  if (exercises.length === 0) return null;
  return {
    id: customDayId(workout.id),
    name: normalizeCustomWorkoutName(workout.name) || fallbackName,
    meta,
    exercises
  };
}
