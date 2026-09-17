import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";
import { domainCompleteSet, domainStartPlan } from "./dualWrite.ts";
import {
  getBoundDomainSessionId,
  getWebSessionService,
  resetWebSessionForTests,
} from "./sessionService.ts";

beforeEach(() => {
  resetWebSessionForTests();
});

test("same plan resumes without abandon", async () => {
  await domainStartPlan("full-15");
  const firstId = getBoundDomainSessionId();
  assert.ok(firstId);

  await domainCompleteSet({ exerciseId: "squat", reps: 12, restSec: 45 });

  const eventsBefore = await getWebSessionService().listEvents(firstId!);
  assert.ok(eventsBefore.length > 0);

  // Simulate tab reopen / second start of the same plan — no domainEndSession.
  await domainStartPlan("full-15");

  const secondId = getBoundDomainSessionId();
  assert.equal(secondId, firstId);

  const session = await getWebSessionService().getSession(firstId!);
  assert.ok(session);
  assert.notEqual(session!.status, "abandoned");
  assert.equal(session!.templateRevisionId, "plan-full-15");

  const eventsAfter = await getWebSessionService().listEvents(firstId!);
  assert.equal(eventsAfter.length, eventsBefore.length);
  assert.ok(
    session!.steps[0]!.completedSets.length >= 1,
    "completed set from first visit must remain",
  );
});

test("different plan abandons previous", async () => {
  await domainStartPlan("full-15");
  const planAId = getBoundDomainSessionId();
  assert.ok(planAId);

  await domainStartPlan("legs-25");

  const planBId = getBoundDomainSessionId();
  assert.ok(planBId);
  assert.notEqual(planBId, planAId);

  const abandoned = await getWebSessionService().getSession(planAId!);
  assert.equal(abandoned?.status, "abandoned");

  const next = await getWebSessionService().getSession(planBId!);
  assert.ok(next);
  assert.equal(next!.templateRevisionId, "plan-legs-25");
  assert.notEqual(next!.status, "abandoned");
});
