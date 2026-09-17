import assert from "node:assert/strict";
import { test } from "node:test";
import { WebMemorySessionRepository } from "./memoryRepo.ts";
import type { WorkoutSession } from "@forma/workout-domain";

function minimalSession(id: string): WorkoutSession {
  return {
    sessionId: id,
    userId: "local-user",
    status: "active",
    templateRevisionId: "plan-x",
    contentHash: "h",
    steps: [],
    currentStepIndex: 0,
    restEndsAtMs: null,
    startedAtMs: 1,
    completedAtMs: null,
    lastEventOrdinal: 0,
    rowVersion: 1,
    localStartDate: "2026-09-17",
    timezone: "UTC",
  };
}

test("memory repo commit + get without storage", async () => {
  const repo = new WebMemorySessionRepository({ persist: false });
  const s = minimalSession("s1");
  await repo.commitSessionChange({ session: s, events: [] });
  const got = await repo.getSession("s1");
  assert.equal(got?.sessionId, "s1");
  assert.equal(got?.status, "active");
});

test("bound session id roundtrip in memory", () => {
  const repo = new WebMemorySessionRepository({ persist: false });
  repo.setBoundSessionId("abc");
  assert.equal(repo.getBoundSessionId(), "abc");
  repo.clear();
  assert.equal(repo.getBoundSessionId(), null);
});
