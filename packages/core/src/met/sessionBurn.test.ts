import assert from "node:assert/strict";
import { test } from "node:test";
import { estimateBurnFromSetLogs, estimateSessionBurnKcal } from "./sessionBurn.ts";

test("estimateSessionBurnKcal returns 0 for empty or invalid input", () => {
  assert.equal(estimateSessionBurnKcal({ weightKg: 70, setsCompleted: 0 }), 0);
  assert.equal(estimateSessionBurnKcal({ weightKg: 0, setsCompleted: 5 }), 0);
});

test("estimateSessionBurnKcal scales with sets", () => {
  const one = estimateSessionBurnKcal({ weightKg: 80, setsCompleted: 1, met: 5 });
  const three = estimateSessionBurnKcal({ weightKg: 80, setsCompleted: 3, met: 5 });
  assert.ok(one > 0);
  assert.equal(three, one * 3);
});

test("estimateBurnFromSetLogs uses exercise MET map", () => {
  const dateKey = "2026-09-16";
  const logs = [
    { id: "1", exerciseId: 1, dateKey, weight: 80, reps: 8, rir: 2 },
    { id: "2", exerciseId: 1, dateKey, weight: 80, reps: 8, rir: 2 },
    { id: "3", exerciseId: 2, dateKey, weight: 100, reps: 5, rir: 1 },
    { id: "4", exerciseId: 99, dateKey: "2026-09-15", weight: 50, reps: 10, rir: 2 },
  ];
  const burned = estimateBurnFromSetLogs({
    weightKg: 76,
    setLogs: logs,
    dateKey,
    exerciseNames: { 1: "Приседания со штангой", 2: "Становая тяга" },
  });
  assert.ok(burned > 0);
  // three sets today only (other date ignored)
  const baseline = estimateSessionBurnKcal({ weightKg: 76, setsCompleted: 3, met: 6 });
  assert.ok(Math.abs(burned - baseline) < baseline * 0.4);
});
