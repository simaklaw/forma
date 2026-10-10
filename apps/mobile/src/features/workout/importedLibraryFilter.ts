import type { ImportedExercise } from './importedExerciseLibrary.generated';

/** Pure filter for the imported library list (search + category). */
export function filterImportedLibrary(
  items: ImportedExercise[],
  query: string,
  category: ImportedExercise['category'] | null
): ImportedExercise[] {
  const q = query.trim().toLocaleLowerCase('ru-RU');
  return items.filter((ex) => {
    const hay =
      `${ex.nameEn} ${ex.nameRu ?? ''} ${ex.primaryMuscles.join(' ')}`.toLocaleLowerCase('ru-RU');
    const matchesQuery = !q || hay.includes(q);
    const matchesCategory = !category || ex.category === category;
    return matchesQuery && matchesCategory;
  });
}
