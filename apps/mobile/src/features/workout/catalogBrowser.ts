import type { MuscleKey } from '@/components/MuscleMap';
import type { ExerciseDef } from './ExerciseSheet';
import { CATALOGS, type TrainingMode } from './catalog';

export type CatalogItem = ExerciseDef & { mode: TrainingMode; dayName: string };

export function normalizeCatalogQuery(value: string): string {
  return value.trim().toLocaleLowerCase('ru-RU');
}

export function buildCatalogItems(mode: TrainingMode): CatalogItem[] {
  return CATALOGS[mode].flatMap((day) =>
    day.exercises.map((exercise) => ({ ...exercise, mode, dayName: day.name }))
  );
}

export function filterCatalogItems(
  items: CatalogItem[],
  query: string,
  muscle: MuscleKey | null
): CatalogItem[] {
  const q = normalizeCatalogQuery(query);
  return items.filter((item) => {
    const haystack = normalizeCatalogQuery(`${item.name} ${item.dayName} ${item.note}`);
    const matchesQuery = !q || haystack.includes(q);
    const matchesMuscle = !muscle || item.targetMuscles.includes(muscle);
    return matchesQuery && matchesMuscle;
  });
}
