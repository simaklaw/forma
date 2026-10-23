import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { estimateOneRepMax, strengthTrends } from "./StrengthStats.ts";
import type { SetLogEntry } from "./WorkoutStats.ts";

const NOW = new Date(2026, 9, 23, 12);

function log(exerciseId: number, dateKey: string, weight: number, reps: number): SetLogEntry {
  return {
    id: exerciseId + "-" + dateKey + "-" + weight + "-" + reps,
    exerciseId,
    dateKey,
    weight,
    reps,
    rir: 0,
  };
}

describe("estimateOneRepMax (Epley)", () => {
  it("matches known Epley values", () => {
    assert.equal(estimateOneRepMax(100, 5), 116.7);
    assert.equal(estimateOneRepMax(120, 1), 124);
  });

  it("returns 0 for invalid or bodyweight input", () => {
    assert.equal(estimateOneRepMax(0, 10), 0);
    assert.equal(estimateOneRepMax(60, 0), 0);
    assert.equal(estimateOneRepMax(-10, 5), 0);
    assert.equal(estimateOneRepMax(Number.NaN, 5), 0);
  });
});

describe("strengthTrends", () => {
  it("computes best/current e1RM, 30-day delta, volume and set count", () => {
    const logs = [
      log(1, "2026-09-20", 60, 4), // предыдущее окно: e1RM 68
      log(1, "2026-10-10", 80, 5), // текущее окно: e1RM 93.3
      log(1, "2026-09-24", 70, 2), // текущее окно: e1RM 74.7
      log(1, "2026-08-20", 100, 6), // старая история: лучший e1RM 120
    ];
    const trends = strengthTrends(logs, NOW);
    assert.equal(trends.length, 1);
    const t = trends[0]!;
    assert.equal(t.exerciseId, 1);
    assert.equal(t.bestOneRmKg, 120);
    assert.equal(t.currentOneRmKg, 93.3);
    assert.equal(t.previousOneRmKg, 68);
    assert.equal(t.deltaKg, 25.3);
    assert.equal(t.totalVolumeKg, 1380);
    assert.equal(t.setCount, 4);
  });

  it("delta is null without a previous window", () => {
    const t = strengthTrends([log(2, "2026-10-15", 50, 3)], NOW)[0]!;
    assert.equal(t.previousOneRmKg, null);
    assert.equal(t.deltaKg, null);
    assert.equal(t.currentOneRmKg, 55);
  });

  it("sorts by best e1RM descending", () => {
    const trends = strengthTrends(
      [log(3, "2026-10-10", 40, 5), log(4, "2026-10-11", 60, 5), log(5, "2026-10-12", 10, 5)],
      NOW,
    );
    assert.deepEqual(trends.map((t) => t.exerciseId), [4, 3, 5]);
  });

  it("ignores bodyweight (weight 0) logs", () => {
    assert.equal(strengthTrends([log(6, "2026-10-10", 0, 12)], NOW).length, 0);
  });
});
