import type { MuscleKey } from '@/domain/muscleKeys';
import type { Sex } from '@/engines/MetabolicEngine';
import type { ExerciseDef } from './ExerciseSheet';
import { catalogFor, type TrainingMode } from './catalog';
import { matchesAllTokens, normalizeSearchText } from '@/lib/normalizeSearch';

export type CatalogItem = ExerciseDef & {
  mode: TrainingMode;
  dayName: string;
  dayId: string;
};

export type Equipment =
  'none' | 'bands' | 'dumbbells' | 'barbell' | 'machine' | 'pullup-bar' | 'bench';

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  none: 'Без оборудования',
  bands: 'Резинки',
  dumbbells: 'Гантели',
  barbell: 'Штанга',
  machine: 'Тренажёр',
  'pullup-bar': 'Турник',
  bench: 'Скамья'
};

/**
 * Diacritics-insensitive normalization (workout-guide pattern — see
 * src/lib/normalizeSearch). Exported so callers can mirror filter rules.
 */
export function normalizeCatalogQuery(value: string): string {
  return normalizeSearchText(value);
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
    day.exercises.map((exercise) => ({
      ...exercise,
      mode,
      dayName: day.name,
      dayId: day.id
    }))
  );
}

export function filterCatalogItems(
  items: CatalogItem[],
  query: string,
  muscle: MuscleKey | null,
  equipment: Equipment | null = null
): CatalogItem[] {
  return items.filter((item) => {
    const matchesQuery = matchesAllTokens(`${item.name} ${item.dayName} ${item.note}`, query);
    const matchesMuscle = !muscle || item.targetMuscles.includes(muscle);
    const matchesEquipment = !equipment || inferEquipment(item) === equipment;
    return matchesQuery && matchesMuscle && matchesEquipment;
  });
}
