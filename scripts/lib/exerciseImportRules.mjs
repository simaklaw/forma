/**
 * Pure rules for free-exercise-db → Forma library import.
 * Kept side-effect free so node:test can cover filter/translation heuristics.
 */

export const UNSUPPORTED_EQUIPMENT =
  /\b(?:dumbbells?|barbells?|benches|bench|cables?|machines?|kettlebells?|exercise balls?|stability balls?|medicine balls?|swiss balls?|pull[ -]?up bars?|chin[ -]?up bars?|racks?|smith machines?|weight plates?|step platforms?|chairs?|dip stations?|parallel bars?)\b/i;

/**
 * True when instructions require equipment we do not support for home bodyweight/bands,
 * and there is no explicit floor/mat/band alternative in the same text.
 */
export function requiresUnsupportedEquipment(ex) {
  const instructions = (ex.instructions ?? []).join(' ');
  if (!UNSUPPORTED_EQUIPMENT.test(instructions)) return false;

  const hasNoEquipmentAlternative =
    /\b(?:ground|floor|mat)\b[^.!?]{0,100}\bor\b[^.!?]{0,100}\b(?:bench|chair|equipment)\b/i.test(
      instructions
    ) ||
    /\b(?:bench|chair|equipment)\b[^.!?]{0,100}\bor\b[^.!?]{0,100}\b(?:ground|floor|mat)\b/i.test(
      instructions
    ) ||
    /\bmay hold onto\b[^.!?]{0,80}\b(?:chair|support)\b/i.test(instructions) ||
    /\balternatively\b[^.!?]{0,120}\bstanding on (?:the )?band\b/i.test(instructions);

  return !hasNoEquipmentAlternative;
}

/** Exact-match only; never substring / fuzzy translate. */
export function translateName(nameEn, dictionary) {
  if (dictionary[nameEn]) return dictionary[nameEn];
  return null;
}

export function slugify(id) {
  return id
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/** First mapped primary muscle wins; default category is abs. */
export function categoryFor(primaryMuscles, muscleMap) {
  for (const m of primaryMuscles) {
    if (muscleMap[m]) return muscleMap[m];
  }
  return 'abs';
}


/**
 * Enum domains from the upstream dataset schema (yuhonas/free-exercise-db).
 * Kept in sync with importedLibrarySchema.test.ts, which re-checks the
 * generated library against the same domains.
 */
export const DATASET_LEVELS = new Set(['beginner', 'intermediate', 'expert']);
export const DATASET_FORCES = new Set(['push', 'pull', 'static']);
export const DATASET_MECHANICS = new Set(['isolation', 'compound']);
export const DATASET_CATEGORIES = new Set([
  'strength',
  'stretching',
  'cardio',
  'plyometrics',
  'powerlifting',
  'olympic weightlifting',
  'strongman'
]);
export const DATASET_EQUIPMENT = new Set([
  'body only',
  'bands',
  'dumbbell',
  'barbell',
  'cable',
  'machine',
  'kettlebells',
  'e-z curl bar',
  'other',
  'medicine ball',
  'exercise ball',
  'foam roll'
]);
export const DATASET_MUSCLES = new Set([
  'abdominals',
  'hamstrings',
  'adductors',
  'quadriceps',
  'biceps',
  'shoulders',
  'chest',
  'middle back',
  'calves',
  'glutes',
  'lower back',
  'lats',
  'triceps',
  'traps',
  'forearms',
  'neck',
  'abductors'
]);

const DATASET_ID_PATTERN = /^[0-9a-zA-Z_-]+$/;

/**
 * Schema gate for the raw dataset: runs before the import touches any
 * generated file and throws with ALL collected problems at once.
 *
 * instructions/images may be empty arrays — an upstream quirk: a handful of
 * dataset rows (Iron Cross, Push Press, Kettlebell Halo, …) ship without
 * them, and the import intentionally passes that through.
 */
export function validateDataset(exercises) {
  if (!Array.isArray(exercises) || exercises.length === 0) {
    throw new Error('validateDataset: dataset must be a non-empty array');
  }
  const errors = [];
  const seenIds = new Set();

  exercises.forEach((ex, i) => {
    if (ex == null || typeof ex !== 'object') {
      errors.push(`#${i}: not an object`);
      return;
    }
    const where = `#${i}${typeof ex.id === 'string' ? ` (${ex.id})` : ''}`;

    if (typeof ex.id !== 'string' || !DATASET_ID_PATTERN.test(ex.id)) {
      errors.push(`${where}: id must be a string matching ^[0-9a-zA-Z_-]+$`);
    } else if (seenIds.has(ex.id)) {
      errors.push(`${where}: duplicate id`);
    } else {
      seenIds.add(ex.id);
    }

    if (typeof ex.name !== 'string' || ex.name.length === 0) {
      errors.push(`${where}: name is required`);
    }
    if (!DATASET_LEVELS.has(ex.level)) {
      errors.push(
        `${where}: level must be one of [beginner, intermediate, expert], got "${ex.level}"`
      );
    }
    if (!DATASET_CATEGORIES.has(ex.category)) {
      errors.push(`${where}: unknown dataset category "${ex.category}"`);
    }
    if (ex.equipment != null && !DATASET_EQUIPMENT.has(ex.equipment)) {
      errors.push(`${where}: unknown equipment "${ex.equipment}"`);
    }
    if (ex.force != null && !DATASET_FORCES.has(ex.force)) {
      errors.push(`${where}: force must be push/pull/static or null`);
    }
    if (ex.mechanic != null && !DATASET_MECHANICS.has(ex.mechanic)) {
      errors.push(`${where}: mechanic must be isolation/compound or null`);
    }

    if (!Array.isArray(ex.primaryMuscles) || ex.primaryMuscles.length === 0) {
      errors.push(`${where}: primaryMuscles must be a non-empty array`);
    } else {
      for (const m of ex.primaryMuscles) {
        if (!DATASET_MUSCLES.has(m)) {
          errors.push(`${where}: unknown muscle "${m}" in primaryMuscles`);
        }
      }
    }
    if (!Array.isArray(ex.secondaryMuscles)) {
      errors.push(`${where}: secondaryMuscles must be an array`);
    } else {
      for (const m of ex.secondaryMuscles) {
        if (!DATASET_MUSCLES.has(m)) {
          errors.push(`${where}: unknown muscle "${m}" in secondaryMuscles`);
        }
      }
    }

    if (!Array.isArray(ex.instructions)) {
      errors.push(`${where}: instructions must be an array`);
    } else {
      for (const step of ex.instructions) {
        if (typeof step !== 'string') {
          errors.push(`${where}: instructions must contain strings`);
          break;
        }
      }
    }
    if (!Array.isArray(ex.images)) {
      errors.push(`${where}: images must be an array`);
    }
  });

  if (errors.length > 0) {
    throw new Error(`validateDataset: ${errors.length} problem(s):\n${errors.join('\n')}`);
  }
}
