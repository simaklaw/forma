import assert from "node:assert/strict";
import { test } from "node:test";
import { metForImportedExercise } from "./exerciseMet.ts";

test("metForImportedExercise returns the category MET for bodyweight equipment", () => {
  assert.equal(metForImportedExercise("legs", "bodyweight"), 5.5);
});

test("metForImportedExercise bumps MET slightly for band-resisted exercises", () => {
  assert.equal(metForImportedExercise("arms", "bands"), 3.8);
});

test("metForImportedExercise falls back to the default for an unknown category", () => {
  assert.equal(metForImportedExercise("unknown-category", "bodyweight"), 3.5);
});
