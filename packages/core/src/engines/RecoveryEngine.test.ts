import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { analyzeRecovery } from "./RecoveryEngine.ts";

describe("analyzeRecovery", () => {
  it("peaks with no recent load", () => {
    const now = new Date("2026-10-01T12:00:00");
    const r = analyzeRecovery({
      workouts: [],
      waterLogsMl: 2500,
      intakeKcal: 2200,
      intakeProteinG: 140,
      now,
    });
    assert.equal(r.status, "peak");
    assert.ok(r.recoveryScore >= 85);
  });

  it("flags rest after 4 consecutive days", () => {
    const now = new Date("2026-10-04T12:00:00");
    const workouts = ["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04"].map(
      (date) => ({ date, completed: true }),
    );
    const r = analyzeRecovery({ workouts, waterLogsMl: 2500, now });
    assert.equal(r.status, "rest_required");
    assert.equal(r.consecutiveTrainingDays, 4);
  });

  it("low hydration pulls score down", () => {
    const now = new Date("2026-10-01T12:00:00");
    const dry = analyzeRecovery({
      workouts: [],
      waterLogsMl: 200,
      waterGoalMl: 2500,
      intakeKcal: 2200,
      intakeProteinG: 140,
      now,
    });
    const wet = analyzeRecovery({
      workouts: [],
      waterLogsMl: 2500,
      waterGoalMl: 2500,
      intakeKcal: 2200,
      intakeProteinG: 140,
      now,
    });
    assert.ok(dry.recoveryScore < wet.recoveryScore);
    assert.ok(dry.hydrationScore < wet.hydrationScore);
  });
});
