import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";
import {
  domainCompleteSet,
  domainRestartPlan,
  domainSkipRest,
  domainStartPlan,
  planIdFromTemplateRevision,
  uiSetsFromDomain,
} from "./dualWrite.ts";
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

  const result = await domainStartPlan("full-15");

  const secondId = getBoundDomainSessionId();
  assert.equal(secondId, firstId);
  assert.equal(result.resumed, true);
  assert.ok(result.session);
  assert.equal(result.session!.sessionId, firstId);

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

  const result = await domainStartPlan("legs-25");
  assert.equal(result.resumed, false);

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

test("uiSetsFromDomain mirrors completed set counts", async () => {
  await domainStartPlan("full-15");
  const id = getBoundDomainSessionId();
  assert.ok(id);
  await domainCompleteSet({ exerciseId: "squat", reps: 12, restSec: 45 });

  const session = await getWebSessionService().getSession(id!);
  assert.ok(session);
  const sets = uiSetsFromDomain(session!);
  const squat = sets["squat"];
  assert.ok(squat);
  assert.equal(squat.filter(Boolean).length, 1);
  assert.ok(squat.length >= 1);
  assert.equal(planIdFromTemplateRevision(session!.templateRevisionId), "full-15");
});

test("domainRestartPlan abandons with user_restarted and starts fresh", async () => {
  await domainStartPlan("full-15");
  const firstId = getBoundDomainSessionId();
  assert.ok(firstId);
  await domainCompleteSet({ exerciseId: "squat", reps: 12, restSec: 45 });

  const result = await domainRestartPlan("full-15");
  assert.equal(result.resumed, false);

  const secondId = getBoundDomainSessionId();
  assert.ok(secondId);
  assert.notEqual(secondId, firstId);

  const abandoned = await getWebSessionService().getSession(firstId!);
  assert.equal(abandoned?.status, "abandoned");
  assert.equal(abandoned?.terminalReason, "user_restarted");

  const fresh = await getWebSessionService().getSession(secondId!);
  assert.ok(fresh);
  assert.notEqual(fresh!.status, "abandoned");
  assert.equal(fresh!.steps[0]!.completedSets.length, 0);
});

test("domainSkipRest clears restEndsAtMs after complete_set", async () => {
  await domainStartPlan("full-15");
  const id = getBoundDomainSessionId();
  assert.ok(id);

  const restEnds = await domainCompleteSet({ exerciseId: "squat", reps: 12, restSec: 45 });
  assert.ok(restEnds != null && restEnds > Date.now());

  let session = await getWebSessionService().getSession(id!);
  assert.ok(session);
  assert.equal(session!.restEndsAtMs, restEnds);

  await domainSkipRest();
  session = await getWebSessionService().getSession(id!);
  assert.ok(session);
  assert.equal(session!.restEndsAtMs, null);
});
