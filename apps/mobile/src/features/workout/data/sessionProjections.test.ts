import type { SessionEvent, WorkoutSession } from '@forma/workout-domain';
import { mergeSessionProjection, projectSessionEvents } from './sessionProjections';

const session = {
  localStartDate: '2026-09-17',
  steps: [
    {
      snapshot: {
        stepIndex: 0,
        exerciseId: '1',
        exerciseRevisionId: 'rev-1',
        name: 'Squat',
        targetSets: 3,
        targetReps: 8,
        targetWeightKg: 80,
        restSeconds: 90
      },
      completedSets: [],
      skipped: false
    }
  ]
} satisfies Pick<WorkoutSession, 'localStartDate' | 'steps'>;

function setEvent(eventId: string, setNo: number): SessionEvent {
  return {
    eventId,
    sessionId: 'session-1',
    ordinal: setNo,
    type: 'set_completed',
    occurredAtMs: 1000 + setNo,
    payloadSchemaVersion: 1,
    operationId: `op-${setNo}`,
    payload: {
      stepIndex: 0,
      setNo,
      weightKg: 80,
      reps: 8,
      rir: 2
    }
  };
}

describe('session projections', () => {
  it('projects accepted set events into legacy setLogs and dayProgress', () => {
    const result = projectSessionEvents(session, [setEvent('event-1', 1), setEvent('event-2', 2)]);

    expect(result.setLogs).toEqual([
      { id: 'event-1', exerciseId: 1, dateKey: '2026-09-17', weight: 80, reps: 8, rir: 2 },
      { id: 'event-2', exerciseId: 1, dateKey: '2026-09-17', weight: 80, reps: 8, rir: 2 }
    ]);
    expect(result.dayProgress).toEqual({ '2026-09-17': { 1: 2 } });
  });

  it('ignores non-set events and merges idempotently', () => {
    const first = projectSessionEvents(session, [setEvent('event-1', 1)]);
    const second = projectSessionEvents(session, [setEvent('event-1', 1), setEvent('event-2', 2)]);
    const merged = mergeSessionProjection(first, second);

    expect(merged.setLogs).toHaveLength(2);
    expect(merged.dayProgress).toEqual({ '2026-09-17': { 1: 2 } });
  });
});
