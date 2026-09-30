import { buildSessionProjection, buildSyncPushPayload } from './sessionProjectionPayload';
import type { SessionEvent, WorkoutSession } from '@forma/workout-domain';

function setEvent(
  eventId: string,
  stepIndex: number,
  weightKg = 80,
  reps = 8
): SessionEvent {
  return {
    eventId,
    sessionId: 'session-1',
    ordinal: 1,
    type: 'set_completed',
    occurredAtMs: 1000,
    payloadSchemaVersion: 1,
    operationId: 'op-1',
    payload: {
      stepIndex,
      setNo: 1,
      weightKg,
      reps
    }
  };
}

const baseSession: WorkoutSession = {
  sessionId: 'session-1',
  userId: 'user-1',
  status: 'active',
  templateRevisionId: 'template-1',
  contentHash: 'hash-1',
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
        restSeconds: 60
      },
      completedSets: [],
      skipped: false
    },
    {
      snapshot: {
        stepIndex: 1,
        exerciseId: '2',
        exerciseRevisionId: 'rev-2',
        name: 'Bench Press',
        targetSets: 3,
        targetReps: 8,
        targetWeightKg: 60,
        restSeconds: 60
      },
      completedSets: [],
      skipped: false
    }
  ],
  currentStepIndex: 0,
  restEndsAtMs: null,
  startedAtMs: 1000,
  completedAtMs: null,
  lastEventOrdinal: 1,
  rowVersion: 1,
  localStartDate: '2024-01-15',
  timezone: 'UTC'
};

describe('sessionProjectionPayload', () => {
  describe('buildSessionProjection', () => {
    it('returns empty projection for no events', () => {
      const result = buildSessionProjection(baseSession, []);
      expect(result.setLogs).toEqual([]);
      expect(result.dayProgress).toEqual({});
    });

    it('projects set_completed events into setLogs and dayProgress', () => {
      const events: SessionEvent[] = [
        setEvent('event-1', 0, 80, 8),
        setEvent('event-2', 0, 85, 8)
      ];
      const result = buildSessionProjection(baseSession, events);

      expect(result.setLogs).toHaveLength(2);
      expect(result.setLogs[0]).toEqual({
        id: 'event-1',
        exerciseId: 1,
        dateKey: '2024-01-15',
        weight: 80,
        reps: 8,
        rir: 0
      });
      expect(result.setLogs[1]).toEqual({
        id: 'event-2',
        exerciseId: 1,
        dateKey: '2024-01-15',
        weight: 85,
        reps: 8,
        rir: 0
      });

      expect(result.dayProgress).toEqual({
        '2024-01-15': { 1: 2 }
      });
    });

    it('skips non-set_completed events', () => {
      const events: SessionEvent[] = [
        setEvent('event-1', 0),
        {
          ...setEvent('event-2', 0),
          type: 'rest_started',
          payload: { stepIndex: 0, endsAtMs: 2000, durationSeconds: 60 }
        } as SessionEvent,
        setEvent('event-3', 0)
      ];
      const result = buildSessionProjection(baseSession, events);

      expect(result.setLogs).toHaveLength(2);
      expect(result.setLogs.map((l) => l.id)).toEqual(['event-1', 'event-3']);
    });

    it('handles exerciseId conversion safely', () => {
      const badSession: WorkoutSession = {
        ...baseSession,
        steps: [
          {
            snapshot: {
              ...baseSession.steps[0]!.snapshot,
              exerciseId: 'not-a-number'
            },
            completedSets: [],
            skipped: false
          }
        ]
      };
      const events: SessionEvent[] = [setEvent('event-1', 0)];
      const result = buildSessionProjection(badSession, events);

      expect(result.setLogs).toHaveLength(0);
    });
  });

  describe('buildSyncPushPayload', () => {
    it('includes projection in payload', () => {
      const events: SessionEvent[] = [setEvent('event-1', 0)];
      const result = buildSyncPushPayload(baseSession, events);

      expect(result).toHaveProperty('event_id', 'event-1');
      expect(result).toHaveProperty('aggregate_version', 1);
      expect(result).toHaveProperty('projection');
      expect((result.projection as any).setLogs).toHaveLength(1);
    });

    it('handles empty events', () => {
      const result = buildSyncPushPayload(baseSession, []);

      expect(result).toHaveProperty('event_id', 'session-1');
      expect(result).toHaveProperty('aggregate_version', 1);
      expect(result).toHaveProperty('projection');
      expect((result.projection as any).setLogs).toHaveLength(0);
    });
  });
});
