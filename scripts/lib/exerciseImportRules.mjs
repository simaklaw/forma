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
