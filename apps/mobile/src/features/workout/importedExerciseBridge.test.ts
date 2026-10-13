import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  IMPORTED_NUMERIC_ID_BASE,
  allImportedExerciseMeta,
  importedExerciseDefByNumericId,
  importedToExerciseDef,
  isImportedNumericId,
  numericIdForImportedLibId
} from './importedExerciseBridge';
import { IMPORTED_EXERCISE_LIBRARY } from './importedExerciseLibrary.generated';

test('numeric ids are stable and above plan id range', () => {
  const first = IMPORTED_EXERCISE_LIBRARY[0]!;
  const id = numericIdForImportedLibId(first.id);
  assert.ok(id != null);
  assert.ok(id! > IMPORTED_NUMERIC_ID_BASE);
  assert.equal(numericIdForImportedLibId(first.id), id);
  assert.ok(isImportedNumericId(id!));
  assert.equal(isImportedNumericId(10), false);
});

test('importedToExerciseDef maps category muscles and bodyweight load', () => {
  const first = IMPORTED_EXERCISE_LIBRARY[0]!;
  const def = importedToExerciseDef(first);
  assert.equal(def.workingWeight, 0);
  assert.ok(def.name.length > 0);
  assert.ok(def.targetMuscles.length > 0);
  assert.equal(importedExerciseDefByNumericId(def.id)?.id, def.id);
});

test('allImportedExerciseMeta covers every library entry', () => {
  const meta = allImportedExerciseMeta();
  assert.equal(Object.keys(meta).length, IMPORTED_EXERCISE_LIBRARY.length);
  const sampleId = numericIdForImportedLibId(IMPORTED_EXERCISE_LIBRARY[0]!.id)!;
  assert.ok(meta[sampleId]?.category);
  assert.ok(meta[sampleId]?.equipment);
});
