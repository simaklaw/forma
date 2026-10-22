/**
 * Diacritics-insensitive search normalization.
 *
 * Adapted from bryllim/workout-guide (MIT) — src/index.ts normalizeSearchText:
 * https://github.com/bryllim/workout-guide
 *
 * FitPulse adaptations for the RU/EN bilingual catalog:
 * — Cyrillic letters (а-я) are kept alongside a-z0-9;
 * — '&' is treated as a plain separator instead of the word "and";
 * — combining-mark stripping also folds ё → е (and й → и).
 */
export function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\u0430-\u044f]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * True when every whitespace-separated token of the query occurs in the
 * haystack (both sides normalized). Empty query matches everything.
 */
export function matchesAllTokens(haystack: string, query: string): boolean {
  const q = normalizeSearchText(query);
  if (!q) return true;
  const hay = normalizeSearchText(haystack);
  if (!hay) return false;
  return q.split(' ').every((token) => hay.includes(token));
}
