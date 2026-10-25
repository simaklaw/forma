import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WorkoutSession } from '@forma/workout-domain';
import { toDateKey } from '@/engines/WorkoutStats';
import type { ExerciseDef } from './ExerciseSheet';
import { isBodyweightExercise } from './catalog';

/**
 * Автопрогрессия рабочего веса (по мотивам LibreFit «update routine after
 * workout»): после завершённой тренировки пересматривает рабочий вес каждого
 * упражнения. Персистится отдельно от доменных сессий — это пользовательский
 * оверлей плана, он не меняет PLAN_REVISION и не трогает возобновляемые сессии.
 * В разгрузочную (deload) неделю программы рост веса замораживается.
 */

const STORAGE_KEY = 'fitpulse_load_progression_v1';
const ENABLED_KEY = 'fitpulse_load_progression_enabled_v1';

/** Рекомендованный рабочий вес упражнения (кг). */
export interface LoadProgressionEntry {
  targetKg: number;
  /** dateKey последней тренировки, обновившей вес. */
  updatedAt: string;
}

/** exerciseId → рекомендованный рабочий вес. */
export type LoadProgressionMap = Record<string, LoadProgressionEntry>;

export type LoadDecision = 'increase' | 'keep' | 'decrease' | 'skip';

/** Опции пересмотра весов после сессии. */
export interface LoadProgressionOptions {
  /**
   * Разгрузочная (deload) неделя программы: рост веса замораживается,
   * снижения остаются — неделя восстановления не добавляет нагрузку.
   */
  deloadWeek?: boolean;
}

/**
 * Решение с учётом делоада: в разгрузочную неделю 'increase' становится
 * 'keep'; снижения и прочие решения проходят без изменений.
 */
export function deloadAwareDecision(decision: LoadDecision, deloadWeek: boolean): LoadDecision {
  return deloadWeek && decision === 'increase' ? 'keep' : decision;
}

/** Входные данные решения по одному упражнению сессии. */
export interface LoadProgressionInput {
  targetSets: number;
  targetReps: number;
  completedSets: Array<{ weightKg: number; reps: number }>;
  skipped: boolean;
  /** Упражнение со свободным весом (не «свой вес»). */
  weighted: boolean;
}

/** Шаг сессии, приведённый ко входу прогрессии. */
export interface SessionProgressionInput extends LoadProgressionInput {
  exerciseId: string;
}

/**
 * Решение по весу: 'increase' — все плановые подходы сделаны и в каждом
 * повторения не ниже плана; 'decrease' — сделано не меньше двух подходов и
 * среднее число повторений ниже плана; 'keep' — прочее; 'skip' — не
 * пересматривается (свой вес, пропущено или нет подходов).
 */
export function nextLoadDecision(input: LoadProgressionInput): LoadDecision {
  if (!input.weighted || input.skipped || input.completedSets.length === 0) {
    return 'skip';
  }
  if (
    input.completedSets.length >= input.targetSets &&
    input.completedSets.every((set) => set.reps >= input.targetReps)
  ) {
    return 'increase';
  }
  if (input.completedSets.length >= 2) {
    const avgReps =
      input.completedSets.reduce((acc, set) => acc + set.reps, 0) / input.completedSets.length;
    if (avgReps < input.targetReps) {
      return 'decrease';
    }
  }
  return 'keep';
}

/**
 * Следующий рабочий вес: база — средний фактический вес сделанных подходов
 * (план не используется). Шаг +2.5 кг при базе от 20 кг, иначе +1 кг; при
 * снижении пол — 1 кг. Результат округляется до 0.5 кг. null — вес не меняется.
 */
export function nextLoadKg(baseKg: number, decision: LoadDecision): number | null {
  if (decision !== 'increase' && decision !== 'decrease') {
    return null;
  }
  if (!Number.isFinite(baseKg) || baseKg <= 0) {
    return null;
  }
  const step = baseKg >= 20 ? 2.5 : 1;
  const raw = decision === 'increase' ? baseKg + step : Math.max(1, baseKg - step);
  return Math.round(raw * 2) / 2;
}

/** Подменяет рабочий вес упражнений со свободным весом; «свой вес» не трогает. */
export function applyLoadProgression(
  exercises: ExerciseDef[],
  map: LoadProgressionMap
): ExerciseDef[] {
  if (Object.keys(map).length === 0) {
    return exercises;
  }
  return exercises.map((ex) => {
    if (isBodyweightExercise(ex)) {
      return ex;
    }
    const entry = map[String(ex.id)];
    if (
      !entry ||
      typeof entry.targetKg !== 'number' ||
      !Number.isFinite(entry.targetKg) ||
      entry.targetKg <= 0
    ) {
      return ex;
    }
    return { ...ex, workingWeight: entry.targetKg };
  });
}

/** Шаги сессии → входы прогрессии (только непропущенные с подходами). */
export function sessionProgressionInputs(
  session: Pick<WorkoutSession, 'steps'>,
  exercises: ExerciseDef[]
): SessionProgressionInput[] {
  const weightedById = new Map(
    exercises.map((ex) => [String(ex.id), !isBodyweightExercise(ex)] as const)
  );
  return (session.steps ?? [])
    .filter((step) => !step.skipped && step.completedSets.length > 0)
    .map((step) => ({
      exerciseId: step.snapshot.exerciseId,
      targetSets: step.snapshot.targetSets,
      targetReps: step.snapshot.targetReps,
      completedSets: step.completedSets.map((set) => ({
        weightKg: set.weightKg,
        reps: set.reps
      })),
      skipped: step.skipped,
      weighted: weightedById.get(step.snapshot.exerciseId) ?? true
    }));
}

/**
 * Пересчитать веса после тренировки: пишет только increase/decrease записи,
 * возвращает их же или null (выключено тумблером / нечего менять). В делоад
 * (options.deloadWeek) рост замораживается — записываются только снижения.
 * Вызывающий использует fire-and-forget: ошибки глушатся снаружи.
 */
export async function updateLoadProgressionFromSession(
  session: Pick<WorkoutSession, 'steps'>,
  exercises: ExerciseDef[],
  now: Date = new Date(),
  options: LoadProgressionOptions = {}
): Promise<LoadProgressionMap | null> {
  if (!(await isLoadProgressionEnabled())) {
    return null;
  }
  const deloadWeek = options.deloadWeek === true;
  const changed: LoadProgressionMap = {};
  const updatedAt = toDateKey(now);
  for (const input of sessionProgressionInputs(session, exercises)) {
    const decision = deloadAwareDecision(nextLoadDecision(input), deloadWeek);
    if (decision !== 'increase' && decision !== 'decrease') {
      continue;
    }
    const baseKg =
      input.completedSets.reduce((acc, set) => acc + set.weightKg, 0) /
      input.completedSets.length;
    const targetKg = nextLoadKg(baseKg, decision);
    if (targetKg == null) {
      continue;
    }
    changed[input.exerciseId] = { targetKg, updatedAt };
  }
  if (Object.keys(changed).length === 0) {
    return null;
  }
  await writeAll({ ...(await readAll()), ...changed });
  return changed;
}

function isValidEntry(value: unknown): value is LoadProgressionEntry {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.targetKg === 'number' &&
    Number.isFinite(entry.targetKg) &&
    entry.targetKg > 0 &&
    typeof entry.updatedAt === 'string'
  );
}

async function readAll(): Promise<LoadProgressionMap> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }
    const out: LoadProgressionMap = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (isValidEntry(value)) {
        out[key] = value;
      }
    }
    return out;
  } catch {
    return {};
  }
}

async function writeAll(data: LoadProgressionMap): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/** Текущие рекомендации (экран тренировки применяет их к плану дня). */
export async function loadLoadProgression(): Promise<LoadProgressionMap> {
  return readAll();
}

/** Тумблер в профиле: по умолчанию включена. */
export async function isLoadProgressionEnabled(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(ENABLED_KEY);
    return raw !== 'false';
  } catch {
    return true;
  }
}

export async function setLoadProgressionEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(ENABLED_KEY, enabled ? 'true' : 'false');
}
