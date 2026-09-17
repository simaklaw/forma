import { planById } from "./catalog.ts";
import type { Session } from "./types.ts";

/** First exercise index that still has incomplete sets (or last if all done). */
export function currentStepIndex(
  planId: string,
  setsDone: Record<string, boolean[]>,
): number {
  const plan = planById(planId);
  if (!plan || plan.exerciseIds.length === 0) return 0;
  for (let i = 0; i < plan.exerciseIds.length; i++) {
    const id = plan.exerciseIds[i]!;
    const sets = setsDone[id] ?? [];
    if (!sets.length || !sets.every(Boolean)) return i;
  }
  return plan.exerciseIds.length - 1;
}

/** Index of first incomplete set for an exercise, or -1 if all done / empty. */
export function nextOpenSetIndex(sets: boolean[] | undefined): number {
  if (!sets || !sets.length) return -1;
  const i = sets.findIndex((d) => !d);
  return i;
}

/**
 * Whether the user may mark this set now.
 * Sequential: only the first incomplete exercise, and only its next open set.
 * Un-marking (done → false) is always allowed for that exercise's completed sets.
 */
export function canMarkSet(
  session: Pick<Session, "planId" | "setsDone">,
  exerciseId: string,
  setIndex: number,
): boolean {
  const plan = planById(session.planId);
  if (!plan) return false;
  const arr = session.setsDone[exerciseId] ?? [];
  if (setIndex < 0 || setIndex >= arr.length) return false;

  // Un-toggle a completed set on the current exercise is fine.
  if (arr[setIndex]) {
    const step = currentStepIndex(session.planId, session.setsDone);
    return plan.exerciseIds[step] === exerciseId;
  }

  const step = currentStepIndex(session.planId, session.setsDone);
  if (plan.exerciseIds[step] !== exerciseId) return false;
  return nextOpenSetIndex(arr) === setIndex;
}

export function expectedExerciseId(
  planId: string,
  setsDone: Record<string, boolean[]>,
): string | null {
  const plan = planById(planId);
  if (!plan) return null;
  const i = currentStepIndex(planId, setsDone);
  return plan.exerciseIds[i] ?? null;
}
