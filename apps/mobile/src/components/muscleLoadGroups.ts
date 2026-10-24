/**
 * Свёртка недельной нагрузки по мышцам (muscleVolumeStats из @forma/core)
 * в группы интерактивной карты мышц: суммирование сетов группы и пересчёт
 * статуса MEV/MRV от суммы. Пороги — DEFAULT_MEV / DEFAULT_MRV из core.
 */
import { DEFAULT_MEV, DEFAULT_MRV, type MuscleLoadStatus } from '@forma/core';
import { MUSCLE_GROUP_MUSCLES, type MusclePickerGroupKey } from './musclePickerGroups';

export interface MuscleLoadEntry {
  /** Ключ мышцы: domain MuscleKey или датасетное имя free-exercise-db. */
  muscle: string;
  /** Взвешенные подходы мышцы за окно. */
  weeklySets: number;
  status: MuscleLoadStatus;
}

export interface MuscleGroupLoad {
  group: MusclePickerGroupKey;
  weeklySets: number;
  status: MuscleLoadStatus;
}

/** Датасетное имя мышцы → группа карты. */
const DATASET_MUSCLE_TO_GROUP: Record<string, MusclePickerGroupKey> = {};
for (const [group, muscles] of Object.entries(MUSCLE_GROUP_MUSCLES) as Array<[
  MusclePickerGroupKey,
  string[]
]>) {
  for (const muscle of muscles) {
    DATASET_MUSCLE_TO_GROUP[muscle] = group;
  }
}

// Алиасы ключей домена MuscleKey, не совпадающих с датасетными именами.
const ALIASES: Record<string, MusclePickerGroupKey> = {
  core: 'abdominals',
  quads: 'quadriceps',
  lowerback: 'back',
  back: 'back'
};

/** Ключ мышцы → группа карты; null — мышцы на карте нет. */
export function muscleLoadGroup(muscle: string): MusclePickerGroupKey | null {
  return ALIASES[muscle] ?? DATASET_MUSCLE_TO_GROUP[muscle] ?? null;
}

/** Статус от суммарных сетов группы; пороги core по умолчанию (10/20). */
export function loadStatusForSets(
  weeklySets: number,
  mev: number = DEFAULT_MEV,
  mrv: number = DEFAULT_MRV
): MuscleLoadStatus {
  if (weeklySets < mev) return 'under';
  if (weeklySets <= mrv) return 'optimal';
  return 'junk';
}

/**
 * Свёртка нагрузки в группы карты: сеты группы суммируются, статус
 * пересчитывается от суммы. Мышцы без представления на карте пропускаются.
 * Сортировка: больше подходов — выше.
 */
export function groupLoads(
  loads: readonly MuscleLoadEntry[],
  mev: number = DEFAULT_MEV,
  mrv: number = DEFAULT_MRV
): MuscleGroupLoad[] {
  const byGroup = new Map<MusclePickerGroupKey, number>();
  for (const load of loads) {
    const group = muscleLoadGroup(load.muscle);
    if (group === null) continue;
    byGroup.set(group, (byGroup.get(group) ?? 0) + load.weeklySets);
  }
  return [...byGroup.entries()]
    .map(([group, weeklySets]) => ({ group, weeklySets, status: loadStatusForSets(weeklySets, mev, mrv) }))
    .sort((a, b) => b.weeklySets - a.weeklySets || (a.group < b.group ? -1 : 1));
}
