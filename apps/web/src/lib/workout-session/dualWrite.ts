import type { WorkoutSession } from "@forma/workout-domain";
import { planById, planExercises } from "../catalog.ts";
import { todayKey } from "../forma.ts";
import { newSessionId } from "./ids.ts";
import { catalogExercisesToSnapshots, contentHashForCatalog } from "./planToDomain.ts";
import {
  bindDomainSessionId,
  getBoundDomainSessionId,
  getLocalUserId,
  getWebSessionService,
} from "./sessionService.ts";

export type DomainStartResult = {
  resumed: boolean;
  session: WorkoutSession | null;
};

/** Map domain step logs → UI boolean setsDone (length = targetSets). */
export function uiSetsFromDomain(session: WorkoutSession): Record<string, boolean[]> {
  const setsDone: Record<string, boolean[]> = {};
  for (const step of session.steps) {
    const n = step.snapshot.targetSets;
    const done = step.completedSets.length;
    setsDone[step.snapshot.exerciseId] = Array.from({ length: n }, (_, i) => i < done);
  }
  return setsDone;
}

/** Plan id from templateRevisionId `plan-${planId}` (null if unknown shape). */
export function planIdFromTemplateRevision(templateRevisionId: string): string | null {
  if (!templateRevisionId.startsWith("plan-")) return null;
  return templateRevisionId.slice("plan-".length) || null;
}

export async function domainStartPlan(planId: string): Promise<DomainStartResult> {
  try {
    const plan = planById(planId);
    if (!plan) return { resumed: false, session: null };
    const exercises = planExercises(plan);
    if (!exercises.length) return { resumed: false, session: null };

    const svc = getWebSessionService();
    const userId = getLocalUserId();
    const templateRevisionId = `plan-${planId}`;
    const previous = await svc.getResumable(userId);

    if (previous && previous.templateRevisionId === templateRevisionId) {
      bindDomainSessionId(previous.sessionId);
      return { resumed: true, session: previous };
    }

    if (previous) {
      try {
        await svc.dispatch(previous.sessionId, {
          type: "abandon_session",
          reason: "replaced_by_new_session",
        });
      } catch {
        /* already terminal */
      }
    }

    const sessionId = newSessionId();
    const steps = catalogExercisesToSnapshots(exercises);
    await svc.dispatch(null, {
      type: "prepare_session",
      sessionId,
      userId,
      templateRevisionId,
      contentHash: contentHashForCatalog(exercises),
      steps,
      localStartDate: todayKey(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    });
    await svc.dispatch(sessionId, { type: "start_session" });
    bindDomainSessionId(sessionId);
    const session = await svc.getSession(sessionId);
    return { resumed: false, session };
  } catch (err) {
    console.warn("[forma web] domainStartPlan failed", err);
    return { resumed: false, session: null };
  }
}

export async function domainRestartPlan(planId: string): Promise<DomainStartResult> {
  try {
    const svc = getWebSessionService();
    const previous = await svc.getResumable(getLocalUserId());
    if (previous) {
      try {
        await svc.dispatch(previous.sessionId, {
          type: "abandon_session",
          reason: "user_restarted",
        });
      } catch {
        /* already terminal */
      }
    }
    bindDomainSessionId(null);
    return domainStartPlan(planId);
  } catch (err) {
    console.warn("[forma web] domainRestartPlan failed", err);
    return { resumed: false, session: null };
  }
}

export async function peekDomainResumable(): Promise<WorkoutSession | null> {
  try {
    return await getWebSessionService().getResumable(getLocalUserId());
  } catch {
    return null;
  }
}

/** User skipped rest overlay — clear domain restEndsAtMs if resting. */
export async function domainSkipRest(): Promise<void> {
  try {
    const sessionId = getBoundDomainSessionId();
    if (!sessionId) return;
    const svc = getWebSessionService();
    const session = await svc.getSession(sessionId);
    if (!session || session.restEndsAtMs == null) return;
    await svc.dispatch(sessionId, { type: "skip_rest" });
  } catch (err) {
    console.warn("[forma web] domainSkipRest failed", err);
  }
}

/**
 * Record a completed set. Returns domain restEndsAtMs when autoStartRest applied,
 * so UI timer can follow the journal wall-clock (survives reload).
 */
export async function domainCompleteSet(input: {
  exerciseId: string;
  reps: number;
  restSec: number;
}): Promise<number | null> {
  try {
    const sessionId = getBoundDomainSessionId();
    if (!sessionId) return null;
    const svc = getWebSessionService();
    const session = await svc.getSession(sessionId);
    if (!session || session.status === "completed" || session.status === "abandoned") return null;

    const step = session.steps[session.currentStepIndex];
    if (!step || step.snapshot.exerciseId !== input.exerciseId) {
      return null;
    }

    if (session.restEndsAtMs != null) {
      try {
        await svc.dispatch(sessionId, { type: "skip_rest" });
      } catch {
        /* */
      }
    }

    const result = await svc.dispatch(sessionId, {
      type: "complete_set",
      weightKg: 0,
      reps: input.reps,
      autoStartRest: true,
    });
    return result.session.restEndsAtMs;
  } catch (err) {
    console.warn("[forma web] domainCompleteSet failed", err);
    return null;
  }
}

export async function domainEndSession(completed: boolean): Promise<void> {
  try {
    const sessionId = getBoundDomainSessionId();
    if (!sessionId) return;
    const svc = getWebSessionService();
    const session = await svc.getSession(sessionId);
    if (!session || session.status === "completed" || session.status === "abandoned") {
      bindDomainSessionId(null);
      return;
    }
    if (completed) {
      await svc.dispatch(sessionId, {
        type: "complete_session",
        reason: "user_finished_partial",
      });
    } else {
      await svc.dispatch(sessionId, {
        type: "abandon_session",
        reason: "user_left",
      });
    }
    bindDomainSessionId(null);
  } catch (err) {
    console.warn("[forma web] domainEndSession failed", err);
    bindDomainSessionId(null);
  }
}
