import type { WorkoutSession } from "@forma/workout-domain";
import { planById, planExercises } from "../catalog";
import { todayKey } from "../forma";
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

/**
 * Best-effort dual-write into @forma/workout-domain.
 * UI Zustand session remains primary for Forma web player in this step;
 * domain journal is the shared contract with FitPulse mobile.
 */
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
      // Same plan already has a resumable domain session (e.g. tab was closed
      // mid-workout without an explicit finish). Resume it instead of
      // discarding progress — mirrors ActiveSessionController.abandonIfDifferentDay
      // on mobile (apps/mobile/src/features/workout/session/ActiveSessionController.ts).
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

/** Peek resumable domain session without starting a new one (Today card). */
export async function peekDomainResumable(): Promise<WorkoutSession | null> {
  try {
    return await getWebSessionService().getResumable(getLocalUserId());
  } catch {
    return null;
  }
}

/** Record a completed set when user marks a set done (not un-done). */
export async function domainCompleteSet(input: {
  exerciseId: string;
  reps: number;
  restSec: number;
}): Promise<void> {
  try {
    const sessionId = getBoundDomainSessionId();
    if (!sessionId) return;
    const svc = getWebSessionService();
    let session = await svc.getSession(sessionId);
    if (!session || session.status === "completed" || session.status === "abandoned") return;

    const step = session.steps[session.currentStepIndex];
    if (!step || step.snapshot.exerciseId !== input.exerciseId) {
      // Player allows free navigation; domain is sequential — skip mismatched steps.
      return;
    }

    if (session.restEndsAtMs != null) {
      try {
        await svc.dispatch(sessionId, { type: "skip_rest" });
      } catch {
        /* */
      }
    }

    await svc.dispatch(sessionId, {
      type: "complete_set",
      weightKg: 0,
      reps: input.reps,
      autoStartRest: true,
    });
  } catch (err) {
    console.warn("[forma web] domainCompleteSet failed", err);
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
