import type { SessionStepSnapshot } from '@forma/workout-domain';
import { applyCommand } from '@forma/workout-domain';
import { MemorySessionRepository } from './MemorySessionRepository';
import { hashPayload, type SessionRepository } from './SessionRepository';
import { uuidv7 } from './ids';

const steps: SessionStepSnapshot[] = [
  {
    stepIndex: 0,
    exerciseId: '1',
    exerciseRevisionId: 'r1',
    name: 'Squat',
    targetSets: 1,
    targetReps: 5,
    targetWeightKg: 80,
    restSeconds: 0
  }
];

function factories(): Array<{ name: string; create: () => SessionRepository }> {
  return [{ name: 'MemorySessionRepository', create: () => new MemorySessionRepository() }];
}

describe.each(factories())('SessionRepository contract ($name)', ({ create }) => {
  it('commits session + events + checkpoint + outbox together', async () => {
    const repo = create();
    const sessionId = uuidv7(1_700_000_000_000);
    const prepared = applyCommand(
      null,
      {
        type: 'prepare_session',
        sessionId,
        userId: 'u1',
        templateRevisionId: 't1',
        contentHash: 'h',
        steps,
        localStartDate: '2026-09-16',
        timezone: 'UTC'
      },
      { operationId: uuidv7(1), eventId: uuidv7(2), nowMs: 1000 }
    );

    await repo.commitSessionChange({
      session: prepared.session,
      events: prepared.events,
      payloadHashes: prepared.events.map((e) => hashPayload(e.payload)),
      checkpoint: {
        sessionId,
        eventOrdinal: prepared.session.lastEventOrdinal,
        rowVersion: prepared.session.rowVersion,
        aggregate: prepared.session,
        createdAtMs: 1000
      }
    });

    const loaded = await repo.getSession(sessionId);
    expect(loaded?.status).toBe('prepared');
    const events = await repo.listEvents(sessionId);
    expect(events).toHaveLength(1);
    expect(events[0]?.ordinal).toBe(1);
    const checkpoint = await repo.getCheckpoint(sessionId);
    expect(checkpoint?.eventOrdinal).toBe(prepared.session.lastEventOrdinal);
    expect(checkpoint?.aggregate.status).toBe('prepared');
    const outbox = await repo.listPendingOutbox();
    expect(outbox).toHaveLength(1);
  });

  it('commits a multi-event command as ONE outbox row per operation', async () => {
    // complete_set with autoStartRest emits set_completed + rest_started from a
    // single command; both events share ctx.operationId. The outbox is keyed by
    // operation (SQLite PK + API idempotency key), so exactly one row must be
    // written — on real SQLite a second row violates UNIQUE(operation_id) and
    // rolls back the whole commit (set lost on device).
    const repo = create();
    const sessionId = uuidv7(1_700_000_000_050);
    const restSteps: SessionStepSnapshot[] = [{ ...steps[0]!, targetSets: 2, restSeconds: 90 }];
    const prepared = applyCommand(
      null,
      {
        type: 'prepare_session',
        sessionId,
        userId: 'u1',
        templateRevisionId: 't1',
        contentHash: 'h',
        steps: restSteps,
        localStartDate: '2026-09-16',
        timezone: 'UTC'
      },
      { operationId: uuidv7(11), eventId: uuidv7(12), nowMs: 1000 }
    );
    await repo.commitSessionChange({
      session: prepared.session,
      events: prepared.events,
      payloadHashes: prepared.events.map((e) => hashPayload(e.payload))
    });

    const started = applyCommand(
      prepared.session,
      { type: 'start_session' },
      { operationId: uuidv7(13), eventId: uuidv7(14), nowMs: 2000 }
    );
    await repo.commitSessionChange({
      session: started.session,
      events: started.events,
      payloadHashes: started.events.map((e) => hashPayload(e.payload))
    });

    const set = applyCommand(
      started.session,
      { type: 'complete_set', weightKg: 80, reps: 5, rir: 2 },
      { operationId: uuidv7(15), eventId: uuidv7(16), eventId2: uuidv7(17), nowMs: 3000 }
    );
    expect(set.events.map((e) => e.type)).toEqual(['set_completed', 'rest_started']);
    expect(set.events[0]!.operationId).toBe(set.events[1]!.operationId);

    await repo.commitSessionChange({
      session: set.session,
      events: set.events,
      payloadHashes: set.events.map((e) => hashPayload(e.payload))
    });

    // Both journal events are persisted…
    const journaled = await repo.listEvents(sessionId);
    expect(journaled.map((e) => e.type)).toEqual([
      'session_prepared',
      'session_started',
      'set_completed',
      'rest_started'
    ]);
    // …but the outbox holds one row per command (3 commands total).
    const outbox = await repo.listPendingOutbox();
    expect(outbox).toHaveLength(3);
    expect(new Set(outbox.map((r) => r.operationId)).size).toBe(3);
  });

  it('rejects duplicate ordinal (append-only)', async () => {
    const repo = create();
    const sessionId = uuidv7(1_700_000_000_100);
    const prepared = applyCommand(
      null,
      {
        type: 'prepare_session',
        sessionId,
        userId: 'u1',
        templateRevisionId: 't1',
        contentHash: 'h',
        steps,
        localStartDate: '2026-09-16',
        timezone: 'UTC'
      },
      { operationId: uuidv7(3), eventId: uuidv7(4), nowMs: 1000 }
    );
    await repo.commitSessionChange({
      session: prepared.session,
      events: prepared.events,
      payloadHashes: prepared.events.map((e) => hashPayload(e.payload))
    });

    await expect(
      repo.commitSessionChange({
        session: prepared.session,
        events: prepared.events,
        payloadHashes: prepared.events.map((e) => hashPayload(e.payload))
      })
    ).rejects.toThrow(/duplicate/i);
  });

  it('enforces single resumable session per user', async () => {
    const repo = create();
    const a = applyCommand(
      null,
      {
        type: 'prepare_session',
        sessionId: uuidv7(1_700_000_000_200),
        userId: 'u1',
        templateRevisionId: 't1',
        contentHash: 'h',
        steps,
        localStartDate: '2026-09-16',
        timezone: 'UTC'
      },
      { operationId: uuidv7(5), eventId: uuidv7(6), nowMs: 1000 }
    );
    await repo.commitSessionChange({
      session: a.session,
      events: a.events,
      payloadHashes: a.events.map((e) => hashPayload(e.payload))
    });

    const b = applyCommand(
      null,
      {
        type: 'prepare_session',
        sessionId: uuidv7(1_700_000_000_300),
        userId: 'u1',
        templateRevisionId: 't1',
        contentHash: 'h',
        steps,
        localStartDate: '2026-09-16',
        timezone: 'UTC'
      },
      { operationId: uuidv7(7), eventId: uuidv7(8), nowMs: 2000 }
    );

    await expect(
      repo.commitSessionChange({
        session: b.session,
        events: b.events,
        payloadHashes: b.events.map((e) => hashPayload(e.payload))
      })
    ).rejects.toThrow(/single-active/i);
  });
});
