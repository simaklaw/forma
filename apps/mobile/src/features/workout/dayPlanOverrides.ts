import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TrainingMode } from './catalog';
import { CATALOGS } from './catalog';
import type { ExerciseDef } from './ExerciseSheet';

const STORAGE_KEY = 'fitpulse_day_plan_overrides_v1';

/** mode → dayId → ordered exercise ids (same length as base day). */
export type DayPlanOverrides = Record<string, Record<string, number[]>>;

export function dayOverrideKey(mode: TrainingMode, dayId: string): string {
  return `${mode}:${dayId}`;
}

async function readAll(): Promise<DayPlanOverrides> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as DayPlanOverrides;
  } catch {
    return {};
  }
}

async function writeAll(data: DayPlanOverrides): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export async function loadDayOverrideIds(
  mode: TrainingMode,
  dayId: string
): Promise<number[] | null> {
  const all = await readAll();
  const ids = all[mode]?.[dayId];
  if (!Array.isArray(ids) || ids.length === 0) return null;
  if (!ids.every((id) => typeof id === 'number' && Number.isFinite(id))) return null;
  return ids;
}

export async function saveDayOverrideIds(
  mode: TrainingMode,
  dayId: string,
  ids: number[]
): Promise<void> {
  const all = await readAll();
  if (!all[mode]) all[mode] = {};
  all[mode][dayId] = ids;
  await writeAll(all);
}

export async function clearDayOverride(mode: TrainingMode, dayId: string): Promise<void> {
  const all = await readAll();
  if (!all[mode]?.[dayId]) return;
  delete all[mode][dayId];
  if (Object.keys(all[mode]).length === 0) delete all[mode];
  await writeAll(all);
}

/** Flat catalog lookup within a training mode (gym or home). */
export function catalogExerciseById(mode: TrainingMode, id: number): ExerciseDef | null {
  for (const day of CATALOGS[mode]) {
    const found = day.exercises.find((ex) => ex.id === id);
    if (found) return found;
  }
  return null;
}

/**
 * Apply optional id list onto a base day plan.
 * Length must match; unknown ids fall back to the base slot.
 * Reindexes `index` 1..n for UI.
 */
export function resolveDayExercises(
  mode: TrainingMode,
  base: ExerciseDef[],
  overrideIds: number[] | null | undefined
): ExerciseDef[] {
  if (!overrideIds || overrideIds.length !== base.length) {
    return base.map((ex, i) => ({ ...ex, index: i + 1 }));
  }
  return overrideIds.map((id, i) => {
    const fromCatalog = catalogExerciseById(mode, id);
    const source = fromCatalog ?? base[i]!;
    return { ...source, index: i + 1 };
  });
}

/** Replace one slot; seeds full id list from base if no override yet. */
export async function replaceDaySlot(
  mode: TrainingMode,
  dayId: string,
  slotIndex: number,
  newExerciseId: number,
  base: ExerciseDef[]
): Promise<ExerciseDef[]> {
  const existing = await loadDayOverrideIds(mode, dayId);
  const ids = existing && existing.length === base.length ? [...existing] : base.map((ex) => ex.id);
  if (slotIndex < 0 || slotIndex >= ids.length) {
    return resolveDayExercises(mode, base, existing);
  }
  ids[slotIndex] = newExerciseId;
  await saveDayOverrideIds(mode, dayId, ids);
  return resolveDayExercises(mode, base, ids);
}
