import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { personalRecords } from "./PersonalRecords.ts";
import type { SetLogEntry } from "./WorkoutStats.ts";

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

const day = (n: number): string => "2026-10-" + String(n).padStart(2, "0");

describe("personalRecords", () => {
  it("sets five gold records on the first session", () => {
    const recs = personalRecords([log(1, day(1), 60, 8)]);
    const r = recs[0]!;
    assert.equal(r.sessionCount, 1);
    assert.equal(r.bests.maxWeightKg, 60);
    assert.equal(r.bests.maxReps, 8);
    assert.equal(r.bests.maxOneRmKg, 76);
    assert.equal(r.bests.maxSetVolumeKg, 480);
    assert.equal(r.bests.maxSessionVolumeKg, 480);
    assert.equal(r.events.length, 5);
    assert.ok(r.events.every((e) => e.tier === "gold"));
    assert.ok(r.events.every((e) => e.improvementPct === null));
    assert.equal(r.lastPrDateKey, day(1));
  });

  it("awards silver for marginal and gold for solid improvements", () => {
    const recs = personalRecords([
      log(2, day(1), 100, 5),
      log(2, day(8), 101, 5),
      log(2, day(15), 106, 5),
    ]);
    const weight = recs[0]!.events.filter((e) => e.type === "max_weight");
    assert.deepEqual(weight.map((e) => e.tier), ["gold", "silver", "gold"]);
    assert.deepEqual(weight.map((e) => e.value), [100, 101, 106]);
    assert.equal(weight[1]!.improvementPct, 1);
    assert.equal(weight[2]!.improvementPct, 5);
  });

  it("awards bronze for repeating an existing record", () => {
    const recs = personalRecords([log(3, day(1), 60, 8), log(3, day(8), 60, 8)]);
    const weight = recs[0]!.events.filter((e) => e.type === "max_weight");
    assert.deepEqual(weight.map((e) => e.tier), ["gold", "bronze"]);
    assert.equal(weight[1]!.improvementPct, 0);
    assert.equal(weight[1]!.premature, false);
  });

  it("tracks rep records only at 80%+ of the top weight", () => {
    const recs = personalRecords([
      log(4, day(1), 100, 5),
      log(4, day(8), 100, 6),
      log(4, day(15), 60, 12),
    ]);
    const r = recs[0]!;
    assert.equal(r.bests.maxReps, 6);
    const reps = r.events.filter((e) => e.type === "max_reps");
    assert.equal(reps.length, 2);
    assert.deepEqual(reps.map((e) => e.value), [5, 6]);
    assert.equal(reps[1]!.weightKg, 100);
    assert.equal(reps[1]!.tier, "gold");
  });

  it("flags a premature PR set on the first set with a big drop", () => {
    const recs = personalRecords([log(5, day(1), 100, 5), log(5, day(1), 80, 5)]);
    const weight = recs[0]!.events.filter((e) => e.type === "max_weight");
    assert.equal(weight.length, 1);
    assert.equal(weight[0]!.premature, true);
  });

  it("does not flag a PR when later sets stay close", () => {
    const recs = personalRecords([
      log(6, day(1), 100, 5),
      log(6, day(1), 102, 5),
      log(6, day(1), 100, 4),
    ]);
    const weight = recs[0]!.events.filter((e) => e.type === "max_weight");
    assert.equal(weight[0]!.premature, false);
    const e1rm = recs[0]!.events.filter((e) => e.type === "max_e1rm");
    assert.equal(e1rm[0]!.premature, false);
  });

  it("computes a severe drought after 8+ weeks without new records", () => {
    const recs = personalRecords(
      [
        log(7, day(1), 60, 8),
        log(7, day(8), 60, 8),
        log(7, day(15), 60, 8),
        log(7, day(22), 55, 8),
      ],
      new Date("2026-12-01T00:00:00Z"),
    );
    const r = recs[0]!;
    assert.equal(r.lastPrDateKey, day(1));
    assert.equal(r.sessionsSinceLastPr, 3);
    assert.equal(r.droughtWeeks, 8);
    assert.equal(r.droughtLevel, "severe");
  });

  it("computes a mild drought between 4 and 7 weeks", () => {
    const recs = personalRecords(
      [log(8, day(1), 60, 8), log(8, day(8), 60, 8), log(8, day(15), 60, 8)],
      new Date("2026-11-04T00:00:00Z"),
    );
    const r = recs[0]!;
    assert.equal(r.droughtWeeks, 4);
    assert.equal(r.droughtLevel, "mild");
  });

  it("ignores drought when too few sessions passed since the PR", () => {
    const recs = personalRecords(
      [log(9, day(1), 60, 8), log(9, day(8), 55, 8)],
      new Date("2026-12-01T00:00:00Z"),
    );
    const r = recs[0]!;
    assert.equal(r.sessionsSinceLastPr, 1);
    assert.equal(r.droughtLevel, "none");
  });

  it("reports zero drought right after a PR", () => {
    const recs = personalRecords([log(10, day(1), 60, 8)], new Date("2026-10-02T00:00:00Z"));
    const r = recs[0]!;
    assert.equal(r.droughtWeeks, 0);
    assert.equal(r.droughtLevel, "none");
  });

  it("skips bodyweight and invalid logs", () => {
    assert.equal(personalRecords([log(11, day(1), 0, 12)]).length, 0);
    assert.equal(personalRecords([log(12, day(1), -5, 8)]).length, 0);
  });

  it("sorts exercises by the most recent record", () => {
    const recs = personalRecords([log(30, day(5), 100, 5), log(31, day(9), 80, 5)]);
    assert.deepEqual(recs.map((r) => r.exerciseId), [31, 30]);
  });

  it("collapses same-day sets into one session", () => {
    const recs = personalRecords([
      log(40, day(1), 60, 8),
      log(40, day(1), 62.5, 6),
      log(40, day(2), 65, 5),
    ]);
    const r = recs[0]!;
    assert.equal(r.sessionCount, 2);
    assert.equal(r.bests.maxWeightKg, 65);
    assert.equal(r.bests.maxSessionVolumeKg, 855);
    assert.equal(r.events.filter((e) => e.dateKey === day(1)).length, 5);
    const day2 = r.events.filter((e) => e.dateKey === day(2));
    assert.equal(day2.length, 1);
    assert.equal(day2[0]!.type, "max_weight");
    assert.equal(day2[0]!.tier, "gold");
  });
});
