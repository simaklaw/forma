import assert from "node:assert/strict";
import { test } from "node:test";
import {
  canMarkSet,
  currentStepIndex,
  expectedExerciseId,
  nextOpenSetIndex,
} from "./session-logic.ts";

test("currentStepIndex advances after all sets done", () => {
  const sets = {
    squat: [true, true, true],
    pushup: [false, false, false],
    "glute-bridge": [false, false, false],
    plank: [false, false, false],
  };
  assert.equal(currentStepIndex("full-15", sets), 1);
  assert.equal(expectedExerciseId("full-15", sets), "pushup");
});

test("canMarkSet only next open set on current exercise", () => {
  const session = {
    planId: "full-15",
    setsDone: {
      squat: [true, false, false],
      pushup: [false, false, false],
      "glute-bridge": [false, false, false],
      plank: [false, false, false],
    },
  };
  assert.equal(canMarkSet(session, "squat", 1), true);
  assert.equal(canMarkSet(session, "squat", 2), false);
  assert.equal(canMarkSet(session, "pushup", 0), false);
});

test("nextOpenSetIndex", () => {
  assert.equal(nextOpenSetIndex([true, false, false]), 1);
  assert.equal(nextOpenSetIndex([true, true, true]), -1);
});
