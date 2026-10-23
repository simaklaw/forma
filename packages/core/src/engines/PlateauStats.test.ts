import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { plateauAnalyses } from "./PlateauStats.ts";
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

describe("plateauAnalyses", () => {
  it("returns insufficient_data below 3 sessions", () => {
    const analyses = plateauAnalyses([
      log(1, day(1), 60, 8),
      log(1, day(8), 60, 8),
    ]);
    assert.equal(analyses.length, 1);
    const a = analyses[0]!;
    assert.equal(a.status, "insufficient_data");
    assert.equal(a.suggestion, "log_more");
    assert.equal(a.confidence, "low");
    assert.equal(a.sessionCount, 2);
    assert.equal(a.latestOneRmKg, 76);
    assert.equal(a.relativeSlope, null);
  });

  it("classifies steady progress as growing", () => {
    const weights = [50, 55, 60, 65, 70, 75];
    const analyses = plateauAnalyses(weights.map((w, i) => log(2, day(i + 1), w, 8)));
    const a = analyses[0]!;
    assert.equal(a.status, "growing");
    assert.equal(a.suggestion, "keep_pushing");
    assert.equal(a.sessionCount, 6);
    assert.equal(a.confidence, "medium");
  });

  it("classifies decline as dipping", () => {
    const weights = [70, 68, 66, 64, 62, 60];
    const analyses = plateauAnalyses(weights.map((w, i) => log(3, day(i + 1), w, 8)));
    const a = analyses[0]!;
    assert.equal(a.status, "dipping");
    assert.equal(a.suggestion, "check_recovery");
    assert.equal(a.sessionCount, 6);
  });

  it("classifies flat zigzag as plateau", () => {
    const weights = [60, 62.5, 60, 61.25, 60, 62];
    const analyses = plateauAnalyses(weights.map((w, i) => log(4, day(i + 1), w, 8)));
    const a = analyses[0]!;
    assert.equal(a.status, "plateau");
    assert.equal(a.suggestion, "add_rep_or_weight");
    assert.equal(a.confidence, "medium");
  });

  it("detects a static plateau when top weight and reps are frozen", () => {
    const analyses = plateauAnalyses([
      log(5, day(1), 60, 8),
      log(5, day(8), 60, 8),
      log(5, day(15), 60, 8),
      log(5, day(22), 60, 8),
    ]);
    const a = analyses[0]!;
    assert.equal(a.status, "static_plateau");
    assert.equal(a.suggestion, "change_scheme");
    assert.equal(a.sessionCount, 4);
  });

  it("confidence becomes high with 9+ sessions", () => {
    const analyses = plateauAnalyses(
      Array.from({ length: 9 }, (_, i) => log(6, day(i + 1), 50 + i * 5, 8)),
    );
    const a = analyses[0]!;
    assert.equal(a.sessionCount, 9);
    assert.equal(a.confidence, "high");
    assert.equal(a.status, "growing");
  });

  it("caps analysis at the last 12 sessions", () => {
    const analyses = plateauAnalyses(
      Array.from({ length: 14 }, (_, i) => log(7, day(i + 1), 50 + i * 2.5, 8)),
    );
    assert.equal(analyses[0]!.sessionCount, 12);
  });

  it("collapses sets of one day into a single session", () => {
    const analyses = plateauAnalyses([
      log(8, day(1), 50, 8),
      log(8, day(1), 52.5, 8),
      log(8, day(2), 55, 8),
      log(8, day(2), 57.5, 8),
      log(8, day(3), 60, 8),
      log(8, day(3), 62.5, 8),
    ]);
    const a = analyses[0]!;
    assert.equal(a.sessionCount, 3);
    assert.equal(a.status, "growing");
    assert.equal(a.confidence, "low");
  });

  it("skips bodyweight-only exercises and invalid logs", () => {
    assert.equal(plateauAnalyses([log(9, day(1), 0, 12)]).length, 0);
    assert.equal(plateauAnalyses([log(10, day(1), -5, 8)]).length, 0);
  });

  it("sorts by session count descending", () => {
    const logs = [
      ...Array.from({ length: 6 }, (_, i) => log(20, day(i + 1), 60, 8)),
      ...Array.from({ length: 4 }, (_, i) => log(21, day(i + 1), 40, 10)),
    ];
    assert.deepEqual(plateauAnalyses(logs).map((a) => a.exerciseId), [20, 21]);
  });
});
