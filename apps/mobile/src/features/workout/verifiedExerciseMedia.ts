/**
 * Allow bundled motion only when the exercise's full canonical search term
 * matches the asset's intended movement. `mediaKey` is legacy grouping data,
 * not proof that every exercise assigned that key uses the same technique.
 */
import type { ExerciseMediaKey } from './exerciseMedia';

const CANONICAL_TERM_BY_KEY: Partial<Record<ExerciseMediaKey, string>> = {
  pushup: 'push up',
  squat: 'squat',
  pullup: 'pull ups',
  lunge: 'lunges',
  plank: 'plank',
  'dead-bug': 'dead bug',
  'chair-dip': 'chair dip',
  'glute-bridge': 'glute bridge',
  'hip-thrust': 'hip thrust',
  'row-band': 'band row',
  'shoulder-press': 'shoulder press',
  'side-plank': 'side plank',
  'stomach-vacuum': 'stomach vacuum'
};

function normalizeExerciseTerm(value: string | undefined): string | null {
  if (!value) return null;
  const normalized = value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  return normalized || null;
}

/** Returns a playable bundled key only for an exact, reviewed movement term. */
export function verifiedMediaKeyForExercise(
  mediaKey: ExerciseMediaKey | undefined,
  wgerSearchTerm: string | undefined
): ExerciseMediaKey | undefined {
  if (!mediaKey) return undefined;
  const canonical = CANONICAL_TERM_BY_KEY[mediaKey];
  if (!canonical) return undefined;
  return normalizeExerciseTerm(wgerSearchTerm) === canonical ? mediaKey : undefined;
}
