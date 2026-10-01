import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateStreakStats, evaluateAchievements } from "./Achievements.ts";

describe("achievements", () => {
  it("counts streak skipping empty today", () => {
    const now = new Date("2026-10-03T12:00:00");
    const s = calculateStreakStats(
      [
        { date: "2026-10-01", completed: true },
        { date: "2026-10-02", completed: true },
      ],
      now,
    );
    assert.equal(s.currentStreak, 2);
  });

  it("unlocks first session", () => {
    const list = evaluateAchievements({
      workouts: [{ date: "2026-10-01", completed: true }],
      proteinGoalG: 160,
      restDay: false,
      doneToday: true,
    });
    assert.equal(list.find((a) => a.id === "first_session")?.unlocked, true);
  });
});
