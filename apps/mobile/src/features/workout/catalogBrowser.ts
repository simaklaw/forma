import type { MuscleKey } from '@/components/MuscleMap';
import type { Sex } from '@/engines/MetabolicEngine';
import type { ExerciseDef } from './ExerciseSheet';
import { catalogFor, type TrainingMode } from './catalog';

export type CatalogItem = ExerciseDef & { mode: TrainingMode; dayName: string };

export type Equipment =
  | 'none'
  | 'bands'
  | 'dumbbells'
  | 'barbell'
  | 'machine'
  | 'pullup-bar'
  | 'bench';

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  none: 'Без оборудования',
  bands: 'Резинки',
  dumbbells: 'Гантели',
  barbell: 'Штанга',
  machine: 'Тренажёр',
  'pullup-bar': 'Турник',
  bench: 'Скамья'
};

export function normalizeCatalogQuery(value: string): string {
  return value.trim().toLocaleLowerCase('ru-RU');
}

export function inferEquipment(
  item: Pick<CatalogItem, 'mode' | 'name' | 'wgerSearchTerm'>
): Equipment {
  const text = `${item.name} ${item.wgerSearchTerm ?? ''}`.toLowerCase();
  if (item.mode === 'home') {
    if (/резин|band/.test(text)) return 'bands';
    if (/подтяг|австрал|pull-?up|inverted/.test(text)) return 'pullup-bar';
    return 'none';
  }
  if (/блок|cable|machine|leg press|pushdown|pulldown|leg curl/.test(text)) return 'machine';
  if (/гантел|dumbbell/.test(text)) return 'dumbbells';
  if (/наклонн|скамь|bench/.test(text) && !/жим штанги лёжа|barbell squat/.test(text))
    return 'bench';
  if (/штан|barbell|deadlift|squat|skull|армейск|жим штанги/.test(text)) return 'barbell';
  return 'barbell';
}

export function buildCatalogItems(mode: TrainingMode, sex: Sex | null = 'male'): CatalogItem[] {
  return catalogFor(mode, sex).flatMap((day) =>
    day.exercises.map((exercise) => ({ ...exercise, mode, dayName: day.name }))
  );
}

export function filterCatalogItems(
  items: CatalogItem[],
  query: string,
  muscle: MuscleKey | null,
  equipment: Equipment | null = null
): CatalogItem[] {
  const q = normalizeCatalogQuery(query);
  return items.filter((item) => {
    const haystack = normalizeCatalogQuery(`${item.name} ${item.dayName} ${item.note}`);
    const matchesQuery = !q || haystack.includes(q);
    const matchesMuscle = !muscle || item.targetMuscles.includes(muscle);
    const matchesEquipment = !equipment || inferEquipment(item) === equipment;
    return matchesQuery && matchesMuscle && matchesEquipment;
  });
}
