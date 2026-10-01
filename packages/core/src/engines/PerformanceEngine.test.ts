import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  analyzeWorkoutPerformance,
  getRealtimeSetFeedback,
  type ExerciseCompletion,
} from "./PerformanceEngine.ts";

const now = new Date("2026-10-01T12:00:00");

function ex(
  partial: Partial<ExerciseCompletion> & Pick<ExerciseCompletion, "exerciseId" | "name" | "date">,
): ExerciseCompletion {
  return {
    completed: true,
    regions: ["chest"],
    ...partial,
  };
}

describe("getRealtimeSetFeedback", () => {
  it("first set emphasizes warm-up and joints", () => {
    const fb = getRealtimeSetFeedback({
      exerciseId: "1",
      exerciseName: "Жим",
      currentSetIndex: 0,
      totalSets: 3,
      formCues: ["Лопатки вместе"],
    });
    assert.equal(fb.setNumber, 1);
    assert.match(fb.adjustmentNote, /Разминочный/);
    assert.equal(fb.formFocus, "Лопатки вместе");
    assert.match(fb.safetyCheck, /сустав/);
  });

  it("middle set is working tempo", () => {
    const fb = getRealtimeSetFeedback({
      exerciseId: "1",
      exerciseName: "Жим",
      currentSetIndex: 1,
      totalSets: 4,
    });
    assert.equal(fb.setNumber, 2);
    assert.match(fb.adjustmentNote, /Рабочий/);
  });

  it("final set prioritizes concentration and form", () => {
    const fb = getRealtimeSetFeedback({
      exerciseId: "1",
      exerciseName: "Жим",
      currentSetIndex: 2,
      totalSets: 3,
      suggestedText: "Держи вес",
    });
    assert.equal(fb.setNumber, 3);
    assert.equal(fb.adjustmentNote, "Держи вес");
    assert.match(fb.safetyCheck, /амплитуд/);
  });
});

describe("analyzeWorkoutPerformance", () => {
  it("empty history yields ready muscles and first-session takeaway", () => {
    const r = analyzeWorkoutPerformance({ workouts: [], exercises: [], now });
    assert.equal(r.completedWorkouts, 0);
    assert.equal(r.muscleRecovery.length, 7);
    assert.ok(r.muscleRecovery.every((m) => m.status === "ready"));
    assert.match(r.primaryCoachTakeaway, /Первая сессия/);
  });

  it("same-day region training marks fatigued", () => {
    const r = analyzeWorkoutPerformance({
      workouts: [{ date: "2026-10-01", completed: true }],
      exercises: [
        ex({
          exerciseId: "sq",
          name: "Присед",
          date: "2026-10-01",
          regions: ["legs", "glutes"],
        }),
      ],
      now,
    });
    const legs = r.muscleRecovery.find((m) => m.region === "legs");
    const chest = r.muscleRecovery.find((m) => m.region === "chest");
    assert.equal(legs?.status, "fatigued");
    assert.equal(chest?.status, "ready");
    assert.ok(r.exerciseAnalyses["sq"]);
    assert.equal(r.exerciseAnalyses["sq"].timesCompleted, 1);
  });

  it("yesterday region is recovering", () => {
    const r = analyzeWorkoutPerformance({
      workouts: [{ date: "2026-09-30", completed: true }],
      exercises: [
        ex({
          exerciseId: "bp",
          name: "Жим",
          date: "2026-09-30",
          regions: ["chest"],
        }),
      ],
      now,
    });
    assert.equal(r.muscleRecovery.find((m) => m.region === "chest")?.status, "recovering");
  });

  it("frequent dumbbell work suggests load increase", () => {
    const dates = ["2026-09-20", "2026-09-23", "2026-09-26", "2026-09-29"];
    const exercises = dates.map((date) =>
      ex({
        exerciseId: "dbp",
        name: "Гантели",
        date,
        regions: ["chest", "arms"],
        equipment: ["dumbbells"],
      }),
    );
    const r = analyzeWorkoutPerformance({
      workouts: dates.map((date) => ({ date, completed: true })),
      exercises,
      now,
    });
    const a = r.exerciseAnalyses["dbp"];
    assert.ok(a.timesCompleted >= 4);
    assert.equal(a.actionType, "increase");
    assert.match(a.suggestedText, /2\.5/);
  });
});
