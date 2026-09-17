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
