/**
 * Resolves a local poster without guessing exercise equivalence.
 *
 * Priority:
 * 1. stable imported-library ID -> its own legacy public-domain image;
 * 2. exact plan media key -> bundled thumbnail;
 * 3. exact English slug in the bundled legacy image registry.
 *
 * No substring/fuzzy matching: a similar exercise is not necessarily the
 * same movement or equipment setup.
 */
import { EXERCISE_THUMBNAILS, type ExerciseMediaKey } from './exerciseMedia';
import { realThumbForMediaKey } from './exerciseRealMedia';
import { IMPORTED_EXERCISE_IMAGES } from './importedExerciseImages.generated';
import { libIdForNumericId, IMPORTED_NUMERIC_ID_BASE } from './importedExerciseBridge';

function strictSlug(value: string | undefined): string | null {
  if (!value) return null;
  const slug = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || null;
}

export function exercisePosterAsset(
  exerciseId: number,
  mediaKey?: ExerciseMediaKey,
  wgerSearchTerm?: string
): number | undefined {
  if (exerciseId > IMPORTED_NUMERIC_ID_BASE) {
    const libraryId = libIdForNumericId(exerciseId);
    if (libraryId) {
      const slug = libraryId.replace(/^lib-/, '');
      const bundled = IMPORTED_EXERCISE_IMAGES[slug + '-0'];
      if (bundled !== undefined) return bundled;
    }
  }

  if (mediaKey) {
    const exactKeyPoster = EXERCISE_THUMBNAILS[mediaKey] ?? realThumbForMediaKey(mediaKey);
    if (exactKeyPoster !== undefined) return exactKeyPoster;
  }

  const slug = strictSlug(wgerSearchTerm);
  if (!slug) return undefined;
  // Exact key only. Never reuse a related exercise as a technique illustration.
  return IMPORTED_EXERCISE_IMAGES[slug + '-0'];
}
