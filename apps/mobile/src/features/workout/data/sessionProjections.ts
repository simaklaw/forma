import type { SessionEvent, SessionStepSnapshot, WorkoutSession } from '@forma/workout-domain';
import type { DayProgress, SetLogEntry } from '@/engines/WorkoutStats';

export interface SessionProjection {
  setLogs: SetLogEntry[];
  dayProgress: DayProgress;
}

/**
 * Projects the durable session journal into the legacy UI read model.
 * Only accepted `set_completed` events are projected; terminal/rest events do
 * not create workout sets. The session's localStartDate is the authoritative
 * day key for this P0 local projection.
 */
export function projectSessionEvents(
  session: Pick<WorkoutSession, 'localStartDate' | 'steps'>,
  events: readonly SessionEvent[]
): SessionProjection {
  const steps = session.steps ?? [];
  const snapshots = new Map<number, SessionStepSnapshot>(
    steps.map((step) => [step.snapshot.stepIndex, step.snapshot])
  );
  const setLogs: SetLogEntry[] = [];
  const dayProgress: DayProgress = {};

  for (const event of events) {
    if (event.type !== 'set_completed') continue;
    const snapshot = snapshots.get(event.payload.stepIndex);
    if (!snapshot) continue;
    const exerciseId = Number(snapshot.exerciseId);
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

export function mergeSessionProjection(
  current: SessionProjection,
  next: SessionProjection
): SessionProjection {
  const byId = new Map(current.setLogs.map((entry) => [entry.id, entry]));
  for (const entry of next.setLogs) byId.set(entry.id, entry);

  const dayProgress: DayProgress = Object.fromEntries(
    Object.entries(current.dayProgress).map(([dateKey, progress]) => [dateKey, { ...progress }])
  );
  for (const [dateKey, progress] of Object.entries(next.dayProgress)) {
    const existing = dayProgress[dateKey] ?? {};
    dayProgress[dateKey] = { ...existing };
    for (const [exerciseId, count] of Object.entries(progress)) {
      dayProgress[dateKey][Number(exerciseId)] = Math.max(
        dayProgress[dateKey][Number(exerciseId)] ?? 0,
        count
      );
    }
  }

  return { setLogs: [...byId.values()], dayProgress };
}
