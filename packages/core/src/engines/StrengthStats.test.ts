import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { e1RmDailyBests, estimateEpleyOneRm, strengthTrends } from "./StrengthStats.ts";
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

describe("estimateEpleyOneRm (Epley)", () => {
  it("matches known Epley values", () => {
    assert.equal(estimateEpleyOneRm(100, 5), 116.7);
    assert.equal(estimateEpleyOneRm(120, 1), 124);
  });

  it("returns 0 for invalid or bodyweight input", () => {
    assert.equal(estimateEpleyOneRm(0, 10), 0);
    assert.equal(estimateEpleyOneRm(60, 0), 0);
    assert.equal(estimateEpleyOneRm(-10, 5), 0);
    assert.equal(estimateEpleyOneRm(Number.NaN, 5), 0);
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

describe("strength trend (regression + R2, порт из whoop-mcp)", () => {
  it("classifies a steadily increasing exercise as improving", () => {
    const logs = [
      log(7, "2026-10-01", 50, 1),
      log(7, "2026-10-02", 55, 1),
      log(7, "2026-10-03", 60, 1),
      log(7, "2026-10-04", 65, 1),
      log(7, "2026-10-05", 70, 1),
      log(7, "2026-10-06", 75, 1),
      log(7, "2026-10-07", 80, 1),
      log(7, "2026-10-08", 85, 1),
    ];
    const t = strengthTrends(logs, NOW)[0]!;
    assert.equal(t.trend, "improving");
  });

  it("classifies a steadily decreasing exercise as declining", () => {
    const logs = [
      log(8, "2026-10-01", 85, 1),
      log(8, "2026-10-02", 80, 1),
      log(8, "2026-10-03", 75, 1),
      log(8, "2026-10-04", 70, 1),
      log(8, "2026-10-05", 65, 1),
      log(8, "2026-10-06", 60, 1),
      log(8, "2026-10-07", 55, 1),
      log(8, "2026-10-08", 50, 1),
    ];
    const t = strengthTrends(logs, NOW)[0]!;
    assert.equal(t.trend, "declining");
  });

  it("classifies zigzag values as stable (low R2)", () => {
    const logs = [
      log(9, "2026-10-01", 50, 1),
      log(9, "2026-10-02", 80, 1),
      log(9, "2026-10-03", 50, 1),
      log(9, "2026-10-04", 80, 1),
      log(9, "2026-10-05", 50, 1),
      log(9, "2026-10-06", 80, 1),
    ];
    const t = strengthTrends(logs, NOW)[0]!;
    assert.equal(t.trend, "stable");
  });

  it("returns null trend with fewer than 3 distinct days", () => {
    const t = strengthTrends([log(10, "2026-10-15", 50, 3), log(10, "2026-10-15", 52, 3)], NOW)[0]!;
    assert.equal(t.trend, null);
  });

  it("uses the best e1RM of the day as the trend point", () => {
    const logs = [
      log(11, "2026-10-01", 40, 1),
      log(11, "2026-10-01", 60, 1), // лучший подход дня перекрывает первый
      log(11, "2026-10-02", 70, 1),
      log(11, "2026-10-03", 80, 1),
    ];
    const t = strengthTrends(logs, NOW)[0]!;
    assert.equal(t.trend, "improving"); // дневные точки: 61.7 → 72.3 → 82.7
  });

describe("e1RmDailyBests", () => {
  it("builds a daily best-e1RM series in chronological order", () => {
    const points = e1RmDailyBests(
      [
        log(20, "2026-10-02", 60, 5),
        log(20, "2026-10-01", 50, 5),
        log(20, "2026-10-01", 55, 3),
        log(20, "2026-10-03", 70, 2),
        log(21, "2026-10-01", 100, 5),
      ],
      20,
    );
    assert.deepEqual(points, [
      { dateKey: "2026-10-01", oneRmKg: 60.5 },
      { dateKey: "2026-10-02", oneRmKg: 70 },
      { dateKey: "2026-10-03", oneRmKg: 74.7 },
    ]);
  });

  it("skips warmups, bodyweight logs and other exercises", () => {
    const warmup: SetLogEntry = { ...log(22, "2026-10-01", 40, 10), setType: "warmup" };
    const points = e1RmDailyBests(
      [warmup, log(22, "2026-10-02", 0, 15), log(23, "2026-10-01", 80, 5)],
      22,
    );
    assert.deepEqual(points, []);
  });
});

});
