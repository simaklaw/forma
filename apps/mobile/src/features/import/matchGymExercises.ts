import type { GymCsvParseResult, GymSetType } from '@forma/core';

export interface GymHistoryDraft {
  exerciseId: number;
  dateKey: string;
  weight: number;
  reps: number;
  rir: number;
  /** Тип подхода из импорта Hevy: разминка, дропсет, отказ. */
  setType?: GymSetType;
  /** Идентификатор суперсета из импорта Hevy; подходы одной группы идут друг за другом. */
  supersetId?: string;
}

export type GymNameIndex = {
  exact: Map<string, number | null>;
  core: Map<string, number | null>;
};

/** Ключ точного совпадения: регистр и пунктуация не важны, скобки сохраняются. */
export function exactKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-zа-яё0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Ключ ядра имени: содержимое скобок отбрасывается («жим лёжа (штанга)» → «жим лёжа»). */
export function coreKey(name: string): string {
  return exactKey(name.replace(/\([^)]*\)/g, ' '));
}

function addTo(map: Map<string, number | null>, key: string, id: number): void {
  if (key.length === 0) return;
  if (map.has(key)) {
    if (map.get(key) !== id) map.set(key, null); // имя неоднозначно
  } else {
    map.set(key, id);
  }
}

/** Индекс имён каталога: точные ключи и ключи ядра; коллизии разных id → null. */
export function buildGymNameIndex(entries: Array<{ id: number; aliases: string[] }>): GymNameIndex {
  const exact = new Map<string, number | null>();
  const core = new Map<string, number | null>();
  for (const entry of entries) {
    for (const alias of entry.aliases) {
      addTo(exact, exactKey(alias), entry.id);
      addTo(core, coreKey(alias), entry.id);
    }
  }
  return { exact, core };
}

/**
 * Сопоставление разобранных CSV-подходов с каталогом упражнений.
 * Точное имя → ядро имени (без скобок); без совпадения — в unmatchedNames.
 */
export function matchGymCsvSets(
  result: GymCsvParseResult,
  index: GymNameIndex
): { drafts: GymHistoryDraft[]; unmatchedNames: string[]; totalSets: number } {
  const drafts: GymHistoryDraft[] = [];
  const unmatched = new Set<string>();
  const cache = new Map<string, number | null>();
  const resolve = (name: string): number | null => {
    const hit = cache.get(name);
    if (hit !== undefined) return hit;
    const exact = index.exact.get(exactKey(name));
    const id = exact != null ? exact : index.core.get(coreKey(name)) ?? null;
    cache.set(name, id);
    return id;
  };
  for (const set of result.sets) {
    const exerciseId = resolve(set.exerciseName);
    if (exerciseId == null) {
      unmatched.add(set.exerciseName);
      continue;
    }
    drafts.push({
      exerciseId,
      dateKey: set.dateKey,
      weight: set.weightKg,
      reps: set.reps,
      rir: set.rir,
      setType: set.setType,
      supersetId: set.supersetId
    });
  }
  return { drafts, unmatchedNames: [...unmatched], totalSets: result.sets.length };
}
