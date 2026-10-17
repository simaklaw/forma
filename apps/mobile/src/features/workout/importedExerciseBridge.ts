/**
 * Bridge imported library (string lib-* ids) → numeric exercise ids used by
 * set logs, day overrides, and MET burn estimates.
 *
 * Numeric range starts at 100_000 so it never collides with frozen plan ids 1–30
 * (see HANDOFF.md). Mapping is order-stable for the generated library file.
 */

import type { MuscleKey } from '@/domain/muscleKeys';
import type { ExerciseDef } from './ExerciseSheet';
import {
  IMPORTED_EXERCISE_LIBRARY,
  type ImportedExercise
} from './importedExerciseLibrary.generated';

export const IMPORTED_NUMERIC_ID_BASE = 100_000;

const libIdByNumeric = new Map<number, string>();
const numericByLibId = new Map<string, number>();
const exerciseByNumeric = new Map<number, ImportedExercise>();

function muscleKeyFromPrimary(primary: string[]): MuscleKey[] {
  const map: Record<string, MuscleKey> = {
    abdominals: 'core',
    abs: 'core',
    chest: 'chest',
    lats: 'back',
    middleback: 'back',
    lowerback: 'lowerback',
    traps: 'shoulders',
    back: 'back',
    quadriceps: 'quads',
    hamstrings: 'hamstrings',
    glutes: 'glutes',
    calves: 'calves',
    shoulders: 'shoulders',
    delts: 'shoulders',
    biceps: 'biceps',
    triceps: 'triceps',
    forearms: 'biceps'
  };
  const out: MuscleKey[] = [];
  for (const p of primary) {
    const key = map[p.toLowerCase().replace(/[\s_-]/g, '')] ?? map[p.toLowerCase()];
    if (key && !out.includes(key)) out.push(key);
  }
  if (out.length === 0) out.push('core');
  return out;
}

for (let i = 0; i < IMPORTED_EXERCISE_LIBRARY.length; i++) {
  const ex = IMPORTED_EXERCISE_LIBRARY[i]!;
  const numericId = IMPORTED_NUMERIC_ID_BASE + i + 1;
  libIdByNumeric.set(numericId, ex.id);
  numericByLibId.set(ex.id, numericId);
  exerciseByNumeric.set(numericId, ex);
}

export function isImportedNumericId(id: number): boolean {
  return id > IMPORTED_NUMERIC_ID_BASE && exerciseByNumeric.has(id);
}

export function numericIdForImportedLibId(libId: string): number | null {
  return numericByLibId.get(libId) ?? null;
}

export function libIdForNumericId(id: number): string | null {
  return libIdByNumeric.get(id) ?? null;
}

export function importedByNumericId(id: number): ImportedExercise | null {
  return exerciseByNumeric.get(id) ?? null;
}

export function importedToExerciseDef(ex: ImportedExercise, index = 1): ExerciseDef {
  const id = numericByLibId.get(ex.id);
  if (id == null) {
    throw new Error(`Unknown imported exercise: ${ex.id}`);
  }
  return {
    id,
    index,
    name: ex.nameRu ?? ex.nameEn,
    workingWeight: 0,
    workingReps: 12,
    totalSets: 3,
    restSeconds: 60,
    targetMuscles: muscleKeyFromPrimary(ex.primaryMuscles),
    note: ex.instructionsRu[0] ?? ex.instructionsEn[0] ?? '',
    wgerSearchTerm: ex.nameEn
  };
}

export function importedExerciseDefByNumericId(id: number): ExerciseDef | null {
  const ex = exerciseByNumeric.get(id);
  return ex ? importedToExerciseDef(ex) : null;
}

/** category/equipment for estimateBurnFromSetLogs.exerciseMeta */
export function allImportedExerciseMeta(): Record<
  number,
  { category: string; equipment: string }
> {
  const out: Record<number, { category: string; equipment: string }> = {};
  for (const [id, ex] of exerciseByNumeric) {
    out[id] = { category: ex.category, equipment: ex.equipment };
  }
  return out;
}
