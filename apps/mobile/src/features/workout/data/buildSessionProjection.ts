/**
 * Build session projection for sync push payload enrichment.
 * Extracts the projection data (setLogs, dayProgress) from a WorkoutSession
 * and its events, so that pull changes can properly hydrate the local read model.
 */

import type { SessionEvent, WorkoutSession } from '@forma/workout-domain';
import type { SetLogEntry, DayProgress } from '@/engines/WorkoutStats';
import type { SessionProjection } from './sessionProjections';

/**
 * Build a session projection from a WorkoutSession and its events.
 * This extracts the same data that projectSessionEvents would produce,
 * but directly from the aggregate state for efficiency.
 */
export function buildSessionProjection(
  session: WorkoutSession,
  events: readonly SessionEvent[]
): SessionProjection {
  // Build a map of stepIndex -> exerciseId from the session
  const stepExerciseMap = new Map<number, number>();
  for (const step of session.steps) {
    const exerciseId = Number(step.snapshot.exerciseId);
    if (Number.isSafeInteger(exerciseId)) {
      stepExerciseMap.set(step.snapshot.stepIndex, exerciseId);
    }
  }

  const setLogs: SetLogEntry[] = [];
  const dayProgress: DayProgress = {};

  for (const event of events) {
    if (event.type !== 'set_completed') continue;
    
    const exerciseId = stepExerciseMap.get(event.payload.stepIndex);
    if (exerciseId === undefined) continue;

    setLogs.push({
      id: event.eventId,
      exerciseId,
      dateKey: session.localStartDate,
      weight: event.payload.weightKg,
      reps: event.payload.reps,
      rir: event.payload.rir ?? 0
    });

    const day = dayProgress[session.localStartDate] ?? {};
    day[exerciseId] = (day[exerciseId] ?? 0) + 1;
    dayProgress[session.localStartDate] = day;
  }

  return { setLogs, dayProgress };
}

/**
 * Create the payload for sync push that includes the session projection.
 * This enriches the minimal payload so pull changes can hydrate the local store.
 */
export function buildEnrichedSyncPayload(
  session: WorkoutSession,
  events: readonly SessionEvent[]
): Record<string, unknown> {
  const projection = buildSessionProjection(session, events);
  return {
    event_id: events[0]?.eventId ?? session.sessionId,
    aggregate_version: session.rowVersion,
    projection: {
      setLogs: projection.setLogs,
      dayProgress: projection.dayProgress
    }
  };
}
