import assert from "node:assert/strict";
import { test } from "node:test";
import { catalogExercisesToSnapshots, contentHashForCatalog } from "./planToDomain.ts";
import {
  getWebSessionService,
  resetWebSessionForTests,
  getLocalUserId,
} from "./sessionService.ts";
import { newSessionId } from "./ids.ts";
import type { Exercise } from "../types";

const sample: Exercise[] = [
  {
    id: "squat",
    name: "Приседания",
    muscles: [],
    regions: ["legs"],
    equipment: [],
    jumps: false,
    sets: 2,
    reps: 12,
    unit: "rep",
    restSec: 45,
    cues: [],
    poster: "",
    video: "",
  },
];

test("web session prepare + complete_set via workout-domain", async () => {
  resetWebSessionForTests();
  const svc = getWebSessionService();
  const sessionId = newSessionId();
  const steps = catalogExercisesToSnapshots(sample);

  await svc.dispatch(null, {
    type: "prepare_session",
    sessionId,
    userId: getLocalUserId(),
    templateRevisionId: "plan-full-15",
    contentHash: contentHashForCatalog(sample),
    steps,
    localStartDate: "2026-09-17",
    timezone: "UTC",
  });
  await svc.dispatch(sessionId, { type: "start_session" });

  const after1 = await svc.dispatch(sessionId, {
    type: "complete_set",
    weightKg: 0,
    reps: 12,
    autoStartRest: false,
  });
  assert.equal(after1.session.steps[0]?.completedSets.length, 1);
  assert.equal(after1.session.status, "active");

  const after2 = await svc.dispatch(sessionId, {
    type: "complete_set",
    weightKg: 0,
    reps: 10,
    autoStartRest: false,
  });
  assert.equal(after2.session.steps[0]?.completedSets.length, 2);
});
