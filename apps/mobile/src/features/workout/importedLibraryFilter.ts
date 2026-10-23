import { matchesAllTokens } from '@/lib/normalizeSearch';
import type { ImportedExercise } from './importedExerciseLibrary.generated';

export interface ImportedLibraryFilterOptions {
  level?: string | null;
  equipment?: ImportedExercise['equipment'] | null;
  muscles?: string[] | null;
}

/**
 * Pure filter for the imported library list (search + category + level + equipment + muscles).
 * Search is diacritics-insensitive and token-based: every token of the query
 * must occur in the English name, Russian name, primary or secondary muscles
 * (see src/lib/normalizeSearch — workout-guide pattern).
 */
export function filterImportedLibrary(
  items: ImportedExercise[],
  query: string,
  category: ImportedExercise['category'] | null,
  options: ImportedLibraryFilterOptions = {}
): ImportedExercise[] {
  const level = options.level ?? null;
  const equipment = options.equipment ?? null;
  const muscles = options.muscles ?? null;
  return items.filter((ex) => {
    const matchesQuery = matchesAllTokens(
      `${ex.nameEn} ${ex.nameRu ?? ''} ${ex.primaryMuscles.join(' ')} ${ex.secondaryMuscles.join(' ')}`,
      query
    );
    const matchesCategory = !category || ex.category === category;
    const matchesLevel = !level || ex.level === level;
    const matchesEquipment = !equipment || ex.equipment === equipment;
    const matchesMuscles =
      !muscles ||
      muscles.length === 0 ||
      muscles.some((m) => ex.primaryMuscles.includes(m) || ex.secondaryMuscles.includes(m));
    return matchesQuery && matchesCategory && matchesLevel && matchesEquipment; && matchesMuscles;
  });
}

