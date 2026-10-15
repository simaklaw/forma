import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { analyzeRecovery } from "../engines/RecoveryEngine.ts";
import { buildCoachBrief } from "./coachBrief.ts";

describe("buildCoachBrief", () => {
  it("stays on-device and maps peak to optimal", () => {
    const insight = analyzeRecovery({
      workouts: [],
      waterLogsMl: 2500,
      now: new Date("2026-10-01T12:00:00")
    });
    const brief = buildCoachBrief(insight, "Дом · ноги");
    assert.equal(brief.source, "local_rules");
    assert.equal(brief.readinessStatus, "optimal");
    assert.ok(brief.actionItems.length <= 3);
    assert.match(brief.workoutAdvice, /ноги/);
  });

  it("flags rest after consecutive load", () => {
    const now = new Date("2026-10-04T12:00:00");
    const workouts = ["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04"].map((date) => ({
      date,
      completed: true as const
    }));
    const insight = analyzeRecovery({ workouts, waterLogsMl: 2500, now });
    const brief = buildCoachBrief(insight, "Силовая");
    assert.equal(brief.readinessStatus, "rest_required");
    assert.ok(brief.actionItems.some((a) => /без силовой/i.test(a)));
  });
});
