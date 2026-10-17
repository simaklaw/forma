import type { ImportedExercise } from './importedExerciseLibrary.generated';

export interface ImportedLibraryFilterOptions {
  level?: string | null;
  equipment?: ImportedExercise['equipment'] | null;
}

/** Pure filter for the imported library list (search + category + level + equipment). */
export function filterImportedLibrary(
  items: ImportedExercise[],
  query: string,
  category: ImportedExercise['category'] | null,
  options: ImportedLibraryFilterOptions = {}
): ImportedExercise[] {
  const q = query.trim().toLocaleLowerCase('ru-RU');
  const level = options.level ?? null;
  const equipment = options.equipment ?? null;
  return items.filter((ex) => {
    const hay =
      `${ex.nameEn} ${ex.nameRu ?? ''} ${ex.primaryMuscles.join(' ')}`.toLocaleLowerCase('ru-RU');
    const matchesQuery = !q || hay.includes(q);
    const matchesCategory = !category || ex.category === category;
    const matchesLevel = !level || ex.level === level;
    const matchesEquipment = !equipment || ex.equipment === equipment;
    return matchesQuery && matchesCategory && matchesLevel && matchesEquipment;
  });
}
