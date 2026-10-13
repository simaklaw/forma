import {
  IMPORTED_NUMERIC_ID_BASE,
  allImportedExerciseMeta,
  importedExerciseDefByNumericId,
  importedToExerciseDef,
  isImportedNumericId,
  numericIdForImportedLibId
} from './importedExerciseBridge';
import { IMPORTED_EXERCISE_LIBRARY } from './importedExerciseLibrary.generated';

describe('importedExerciseBridge', () => {
  it('numeric ids are stable and above plan id range', () => {
    const first = IMPORTED_EXERCISE_LIBRARY[0]!;
    const id = numericIdForImportedLibId(first.id);
    expect(id).not.toBeNull();
    expect(id!).toBeGreaterThan(IMPORTED_NUMERIC_ID_BASE);
    expect(numericIdForImportedLibId(first.id)).toBe(id);
    expect(isImportedNumericId(id!)).toBe(true);
    expect(isImportedNumericId(10)).toBe(false);
  });

  it('importedToExerciseDef maps muscles and bodyweight load', () => {
    const first = IMPORTED_EXERCISE_LIBRARY[0]!;
    const def = importedToExerciseDef(first);
    expect(def.workingWeight).toBe(0);
    expect(def.name.length).toBeGreaterThan(0);
    expect(def.targetMuscles.length).toBeGreaterThan(0);
    expect(importedExerciseDefByNumericId(def.id)?.id).toBe(def.id);
  });

  it('allImportedExerciseMeta covers every library entry', () => {
    const meta = allImportedExerciseMeta();
    expect(Object.keys(meta).length).toBe(IMPORTED_EXERCISE_LIBRARY.length);
    const sampleId = numericIdForImportedLibId(IMPORTED_EXERCISE_LIBRARY[0]!.id)!;
    expect(meta[sampleId]?.category).toBeTruthy();
    expect(meta[sampleId]?.equipment).toBeTruthy();
  });
});
