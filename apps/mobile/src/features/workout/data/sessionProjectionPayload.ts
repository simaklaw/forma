/**
 * Generate session projection payload for sync push.
 * This creates the projection data that will be stored in the change feed
 * and sent back to clients via pull, allowing them to hydrate their local read model.
 */

import type { SessionEvent, WorkoutSession } from '@forma/workout-domain';
import type { DayProgress, SetLogEntry } from '@/engines/WorkoutStats';
import type { SessionProjection } from './sessionProjections';

/**
 * Extract session projection from a WorkoutSession and its events.
 * This is the same projection that projectSessionEvents creates, but
 * computed directly from the aggregate state for push payload enrichment.
 */
export function buildSessionProjection(
  session: WorkoutSession,
  events: readonly SessionEvent[]
): SessionProjection {
  const snapshots = new Map<number, { exerciseId: string; stepIndex: number }>(
    session.steps.map((step, idx) => [idx, { exerciseId: step.snapshot.exerciseId, stepIndex: idx }])
  );
  
  const setLogs: SetLogEntry[] = [];
  const dayProgress: DayProgress = {};

  for (const event of events) {
    if (event.type !== 'set_completed') continue;
    const stepInfo = snapshots.get(event.payload.stepIndex);
    if (!stepInfo) continue;
    const exerciseId = Number(stepInfo.exerciseId);
    if (!Number.isSafeInteger(exerciseId)) continue;

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
 * Create sync push payload with embedded projection for workout_session.
 * This enriches the payload so that pull changes can properly hydrate
 * the local read model.
 */
export function buildSyncPushPayload(
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
