import {
  DomainError,
  type SessionStepSnapshot
} from '@forma/workout-domain';
import { MemorySessionRepository } from './MemorySessionRepository';
import { SessionCommandService } from './SessionCommandService';
import { newSessionId } from './ids';

const steps: SessionStepSnapshot[] = [
  {
    stepIndex: 0,
    exerciseId: 'ex-1',
    exerciseRevisionId: 'rev-1',
    name: 'Squat',
    targetSets: 2,
    targetReps: 8,
    targetWeightKg: 80,
    restSeconds: 60
  }
];

function service() {
  const repo = new MemorySessionRepository();
  return { repo, svc: new SessionCommandService(repo) };
}

describe('SessionCommandService + MemorySessionRepository', () => {
  it('prepare → start → complete_set persists session, events, outbox', async () => {
    const { repo, svc } = service();
    const sessionId = newSessionId();

    const prepared = await svc.dispatch(null, {
      type: 'prepare_session',
      sessionId,
      userId: 'user-1',
      templateRevisionId: 'tpl-1',
      contentHash: 'hash',
      steps,
      localStartDate: '2026-09-16',
      timezone: 'UTC'
    }, { nowMs: 1000 });

    expect(prepared.session.status).toBe('prepared');

    const started = await svc.dispatch(sessionId, { type: 'start_session' }, { nowMs: 2000 });
    expect(started.session.status).toBe('active');

    const afterSet = await svc.dispatch(
      sessionId,
      { type: 'complete_set', weightKg: 80, reps: 8, autoStartRest: true },
      { nowMs: 3000 }
    );
    expect(afterSet.session.steps[0]?.completedSets.length).toBe(1);
    expect(afterSet.session.restEndsAtMs).not.toBeNull();

    const loaded = await svc.getSession(sessionId);
    expect(loaded?.lastEventOrdinal).toBe(afterSet.session.lastEventOrdinal);
    expect(loaded?.steps[0]?.completedSets[0]?.reps).toBe(8);

    const checkpoint = await svc.getCheckpoint(sessionId);
    expect(checkpoint?.eventOrdinal).toBe(afterSet.session.lastEventOrdinal);
    expect(checkpoint?.rowVersion).toBe(afterSet.session.rowVersion);
    expect(checkpoint?.aggregate.steps[0]?.completedSets).toHaveLength(1);

    const events = await repo.listEvents(sessionId);
    expect(events.length).toBeGreaterThanOrEqual(3);
    expect(events.map((e) => e.type)).toEqual(
      expect.arrayContaining(['session_prepared', 'session_started', 'set_completed'])
    );

    const outbox = await repo.listPendingOutbox();
    expect(outbox.length).toBe(events.length);
    expect(outbox.every((r) => r.status === 'pending')).toBe(true);
  });

  it('getResumable recovers from the durable checkpoint', async () => {
    const { repo, svc } = service();
    const sessionId = newSessionId();

    await svc.dispatch(null, {
      type: 'prepare_session',
      sessionId,
      userId: 'user-1',
      templateRevisionId: 'tpl-1',
      contentHash: 'hash',
      steps,
      localStartDate: '2026-09-16',
      timezone: 'UTC'
    }, { nowMs: 1000 });
    await svc.dispatch(sessionId, { type: 'start_session' }, { nowMs: 2000 });

    const stored = await svc.getSession(sessionId);
    const checkpoint = await svc.getCheckpoint(sessionId);
    expect(stored).not.toBeNull();
    expect(checkpoint).not.toBeNull();

    const recoveredStep = {
      ...checkpoint!.aggregate.steps[0]!,
      completedSets: [
        {
          setIndex: 0,
          weightKg: 80,
          reps: 8,
          completedAtMs: 2500
        }
      ]
    };
    await repo.saveCheckpoint({
      ...checkpoint!,
      aggregate: {
        ...checkpoint!.aggregate,
        steps: [recoveredStep]
      }
    });

    const recovered = await svc.getResumable('user-1');
    expect(recovered?.sessionId).toBe(sessionId);
    expect(recovered?.steps[0]?.completedSets).toHaveLength(1);
    expect(recovered?.steps[0]?.completedSets[0]?.reps).toBe(8);
  });

  it('getResumable returns active session only', async () => {
    const { svc } = service();
    const sessionId = newSessionId();

    await svc.dispatch(null, {
      type: 'prepare_session',
      sessionId,
      userId: 'user-1',
      templateRevisionId: 'tpl-1',
      contentHash: 'hash',
      steps,
      localStartDate: '2026-09-16',
      timezone: 'UTC'
    }, { nowMs: 1000 });
    await svc.dispatch(sessionId, { type: 'start_session' }, { nowMs: 2000 });

    const resumable = await svc.getResumable('user-1');
    expect(resumable?.sessionId).toBe(sessionId);

    await svc.dispatch(sessionId, { type: 'complete_session' }, { nowMs: 3000 });
    const afterDone = await svc.getResumable('user-1');
    expect(afterDone).toBeNull();
  });

  it('rejects invalid transition without writing', async () => {
    const { repo, svc } = service();
    const sessionId = newSessionId();

    await svc.dispatch(null, {
      type: 'prepare_session',
      sessionId,
      userId: 'user-1',
      templateRevisionId: 'tpl-1',
      contentHash: 'hash',
      steps,
      localStartDate: '2026-09-16',
      timezone: 'UTC'
    }, { nowMs: 1000 });

    await expect(
      svc.dispatch(sessionId, { type: 'complete_set', weightKg: 80, reps: 8 }, { nowMs: 2000 })
    ).rejects.toBeInstanceOf(DomainError);

    const events = await repo.listEvents(sessionId);
    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe('session_prepared');
  });

  it('version conflict does not commit', async () => {
    const { svc } = service();
    const sessionId = newSessionId();

    await svc.dispatch(null, {
      type: 'prepare_session',
      sessionId,
      userId: 'user-1',
      templateRevisionId: 'tpl-1',
      contentHash: 'hash',
      steps,
      localStartDate: '2026-09-16',
      timezone: 'UTC'
    }, { nowMs: 1000 });

    await expect(
      svc.dispatch(sessionId, { type: 'start_session' }, { nowMs: 2000, expectedVersion: 99 })
    ).rejects.toMatchObject({ code: 'version_conflict' });

    const s = await svc.getSession(sessionId);
    expect(s?.status).toBe('prepared');
  });
});
