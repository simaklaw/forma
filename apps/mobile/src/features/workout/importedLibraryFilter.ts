import { matchesAllTokens } from '@/lib/normalizeSearch';
import type { ImportedExercise } from './importedExerciseLibrary.generated';

export interface ImportedLibraryFilterOptions {
  level?: string | null;
  equipment?: ImportedExercise['equipment'] | null;
}

/**
 * Pure filter for the imported library list (search + category + level + equipment).
 * Search is diacritics-insensitive and token-based: every token of the query
 * must occur in the English name, Russian name, or primary muscles
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
  return items.filter((ex) => {
    const matchesQuery = matchesAllTokens(
      `${ex.nameEn} ${ex.nameRu ?? ''} ${ex.primaryMuscles.join(' ')}`,
      query
    );
    const matchesCategory = !category || ex.category === category;
    const matchesLevel = !level || ex.level === level;
    const matchesEquipment = !equipment || ex.equipment === equipment;
    return matchesQuery && matchesCategory && matchesLevel && matchesEquipment;
  });
}
