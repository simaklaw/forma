import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BACKOFF_MIN_BEST_REPS,
  EASY_RIR,
  WARMUP_WEIGHT_RATIO,
  daySetReview,
} from "./SetReview.ts";
import type { GymSetType, SetLogEntry } from "./WorkoutStats.ts";

const DAY = "2026-10-23";

let seq = 0;
function log(
  exerciseId: number,
  weight: number,
  reps: number,
  rir: number,
  dateKey: string = DAY,
  setType?: GymSetType,
): SetLogEntry {
  seq += 1;
  return { id: "log-" + seq, exerciseId, dateKey, weight, reps, rir, setType };
}

describe("daySetReview", () => {
  it("groups sets by exercise for the requested day and keeps log order", () => {
    const review = daySetReview(
      [log(1, 60, 8, 2), log(2, 60, 8, 2), log(1, 62.5, 6, 2), log(1, 60, 8, 2, "2026-10-22")],
      DAY,
    );
    assert.deepEqual(review.exercises.map((e) => e.exerciseId), [1, 2]);
    assert.deepEqual(review.exercises[0]!.sets.map((s) => s.weight), [60, 62.5]);
    assert.equal(review.exercises[0]!.totalSets, 2);
  });

  it("marks well-below-top sets as non-effective warmups", () => {
    const review = daySetReview([log(1, 100, 8, 2), log(1, 150, 5, 2), log(1, 140, 6, 2)], DAY);
    const sets = review.exercises[0]!.sets;
    assert.equal(sets[0]!.scenario, "warmup");
    assert.equal(sets[1]!.scenario, "productive");
    assert.equal(sets[2]!.scenario, "productive");
    assert.equal(review.exercises[0]!.effectiveSets, 2);
  });

  it("classifies failure (RIR 0), grinder (RIR 1) and productive sets", () => {
    const review = daySetReview([log(1, 100, 5, 0), log(1, 100, 5, 1), log(1, 100, 5, 2)], DAY);
    assert.deepEqual(
      review.exercises[0]!.sets.map((s) => s.scenario),
      ["failure", "grinder", "productive"],
    );
    assert.ok(review.exercises[0]!.sets.every((s) => s.effective));
    assert.equal(review.excessiveFailure, false);
  });

  it("classifies easy sets (RIR 4+) as non-effective", () => {
    const review = daySetReview([log(1, 100, 12, 4), log(1, 100, 8, 2), log(1, 100, 10, 3)], DAY);
    const sets = review.exercises[0]!.sets;
    assert.equal(sets[0]!.scenario, "easy");
    assert.equal(sets[0]!.effective, false);
    assert.equal(sets[1]!.scenario, "productive");
    assert.equal(sets[2]!.scenario, "productive");
  });

  it("detects backoff sets by reps collapse at the same weight", () => {
    const review = daySetReview([log(1, 100, 8, 1), log(1, 100, 4, 2), log(1, 100, 3, 2)], DAY);
    assert.deepEqual(
      review.exercises[0]!.sets.map((s) => s.scenario),
      ["grinder", "backoff", "backoff"],
    );
    assert.equal(review.exercises[0]!.effectiveSets, 1);
  });

  it("does not flag backoff when the best set is small", () => {
    const review = daySetReview([log(2, 100, 3, 1), log(2, 100, 1, 2)], DAY);
    assert.equal(review.exercises[0]!.sets[1]!.scenario, "productive");
  });

  it("never marks bodyweight sets as warmups", () => {
    const review = daySetReview([log(1, 0, 15, 2), log(1, 0, 12, 2)], DAY);
    assert.ok(review.exercises[0]!.sets.every((s) => s.scenario !== "warmup"));
  });

  it("flags an all-easy day only when every working set is easy", () => {
    assert.equal(daySetReview([log(1, 60, 12, 4), log(1, 60, 12, 5)], DAY).allEasy, true);
    assert.equal(daySetReview([log(1, 60, 12, 4), log(1, 60, 8, 3)], DAY).allEasy, false);
  });

  it("flags excessive failure and excludes warmups from the rate", () => {
    assert.equal(
      daySetReview([log(1, 60, 5, 0), log(1, 60, 5, 0), log(1, 60, 5, 2)], DAY).excessiveFailure,
      true,
    );
    const withWarmup = daySetReview([log(1, 150, 5, 0), log(1, 100, 5, 0), log(1, 150, 5, 2)], DAY);
    assert.equal(withWarmup.exercises[0]!.sets[1]!.scenario, "warmup");
    assert.equal(withWarmup.excessiveFailure, false);
  });

  it("skips invalid logs", () => {
    assert.equal(daySetReview([log(1, -5, 8, 2)], DAY).exercises.length, 0);
    assert.equal(daySetReview([log(1, 60, 0, 2)], DAY).exercises.length, 0);
    assert.equal(daySetReview([log(1, 60, 8, -1)], DAY).exercises.length, 0);
  });

  it("sums day totals across exercises", () => {
    const review = daySetReview([log(1, 60, 8, 2), log(1, 60, 8, 4), log(2, 40, 10, 1)], DAY);
    assert.equal(review.totalSets, 3);
    assert.equal(review.effectiveSets, 2);
  });

  it("returns an empty review for a day without sets", () => {
    const review = daySetReview([], DAY);
    assert.equal(review.exercises.length, 0);
    assert.equal(review.totalSets, 0);
    assert.equal(review.allEasy, false);
    assert.equal(review.excessiveFailure, false);
  });

  it("exposes the scenario thresholds as constants", () => {
    assert.equal(WARMUP_WEIGHT_RATIO, 0.7);
    assert.equal(EASY_RIR, 4);
    assert.equal(BACKOFF_MIN_BEST_REPS, 6);
  });

  it("gives imported setType priority over weight and RIR heuristics", () => {
    const review = daySetReview(
      [
        log(1, 100, 5, 2, DAY, "warmup"),
        log(1, 100, 5, 3, DAY, "failure"),
        log(1, 100, 5, 3, DAY, "dropset"),
      ],
      DAY,
    );
    const sets = review.exercises[0]!.sets;
    assert.equal(sets[0]!.scenario, "warmup");
    assert.equal(sets[0]!.effective, false);
    assert.equal(sets[1]!.scenario, "failure");
    assert.equal(sets[2]!.scenario, "grinder");
  });
});
