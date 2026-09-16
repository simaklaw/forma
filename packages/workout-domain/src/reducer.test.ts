import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { applyCommand } from './reducer.ts';
import { DomainError, type CommandContext, type SessionStepSnapshot } from './types.ts';

const steps: SessionStepSnapshot[] = [
  {
    stepIndex: 0,
    exerciseId: 'ex-squat',
    exerciseRevisionId: 'rev-squat-1',
    name: 'Приседания',
    targetSets: 2,
    targetReps: 8,
    targetWeightKg: 80,
    restSeconds: 90
  },
  {
    stepIndex: 1,
    exerciseId: 'ex-rdl',
    exerciseRevisionId: 'rev-rdl-1',
    name: 'Становая',
    targetSets: 1,
    targetReps: 5,
    targetWeightKg: 100,
    restSeconds: 120
  }
];

function ctx(n: number): CommandContext {
  return {
    operationId: `op-${n}`,
    eventId: `ev-${n}`,
    nowMs: 1_700_000_000_000 + n * 1000
  };
}

function prepare() {
  return applyCommand(
    null,
    {
      type: 'prepare_session',
      sessionId: 'sess-1',
      userId: 'user-1',
      templateRevisionId: 'tpl-rev-1',
      contentHash: 'abc',
      steps,
      localStartDate: '2026-09-16',
      timezone: 'Europe/Moscow'
    },
    ctx(1)
  );
}

describe('workout-domain applyCommand', () => {
  it('prepares a session with ordinal 1 and status prepared', () => {
    const { session, events } = prepare();
    assert.equal(session.status, 'prepared');
    assert.equal(session.lastEventOrdinal, 1);
    assert.equal(session.rowVersion, 1);
    assert.equal(events[0]?.type, 'session_prepared');
    assert.equal(session.steps.length, 2);
  });

  it('rejects prepare with empty steps', () => {
    assert.throws(
      () =>
        applyCommand(
          null,
          {
            type: 'prepare_session',
            sessionId: 's',
            userId: 'u',
            templateRevisionId: 't',
            contentHash: 'h',
            steps: [],
            localStartDate: '2026-09-16',
            timezone: 'UTC'
          },
          ctx(1)
        ),
      (e: unknown) => e instanceof DomainError && e.code === 'empty_plan'
    );
  });

  it('starts only from prepared', () => {
    const { session } = prepare();
    const started = applyCommand(session, { type: 'start_session' }, ctx(2));
    assert.equal(started.session.status, 'active');
    assert.equal(started.session.startedAtMs, ctx(2).nowMs);

    assert.throws(
      () => applyCommand(started.session, { type: 'start_session' }, ctx(3)),
      (e: unknown) => e instanceof DomainError && e.code === 'invalid_transition'
    );
  });

  it('completes sets, starts rest, and blocks next set until rest skipped', () => {
    let s = prepare().session;
    s = applyCommand(s, { type: 'start_session' }, ctx(2)).session;

    const afterSet = applyCommand(
      s,
      { type: 'complete_set', weightKg: 80, reps: 8, rir: 2, autoStartRest: true },
      ctx(3)
    );
    assert.equal(afterSet.session.steps[0]?.completedSets.length, 1);
    assert.ok(afterSet.session.restEndsAtMs !== null);
    assert.equal(afterSet.events.map((e) => e.type).join(','), 'set_completed,rest_started');

    assert.throws(
      () =>
        applyCommand(
          afterSet.session,
          { type: 'complete_set', weightKg: 80, reps: 8 },
          // still before rest ends
          { ...ctx(3), nowMs: ctx(3).nowMs + 1000 }
        ),
      (e: unknown) => e instanceof DomainError && e.code === 'still_resting'
    );

    const skipped = applyCommand(afterSet.session, { type: 'skip_rest' }, ctx(4));
    assert.equal(skipped.session.restEndsAtMs, null);

    const set2 = applyCommand(
      skipped.session,
      { type: 'complete_set', weightKg: 80, reps: 7, autoStartRest: false },
      ctx(5)
    );
    assert.equal(set2.session.steps[0]?.completedSets.length, 2);
    assert.equal(set2.session.currentStepIndex, 1);
  });

  it('pause and resume round-trip', () => {
    let s = prepare().session;
    s = applyCommand(s, { type: 'start_session' }, ctx(2)).session;
    s = applyCommand(s, { type: 'pause_session' }, ctx(3)).session;
    assert.equal(s.status, 'paused');
    s = applyCommand(s, { type: 'resume_session' }, ctx(4)).session;
    assert.equal(s.status, 'active');
  });

  it('skip_step advances index and records reason', () => {
    let s = prepare().session;
    s = applyCommand(s, { type: 'start_session' }, ctx(2)).session;
    s = applyCommand(s, { type: 'skip_step', reason: 'pain' }, ctx(3)).session;
    assert.equal(s.steps[0]?.skipped, true);
    assert.equal(s.steps[0]?.skipReason, 'pain');
    assert.equal(s.currentStepIndex, 1);
  });

  it('complete_session is terminal; further commands fail', () => {
    let s = prepare().session;
    s = applyCommand(s, { type: 'start_session' }, ctx(2)).session;
    s = applyCommand(s, { type: 'complete_session', reason: 'user_finished_partial' }, ctx(3)).session;
    assert.equal(s.status, 'completed');
    assert.equal(s.terminalReason, 'user_finished_partial');

    assert.throws(
      () => applyCommand(s, { type: 'pause_session' }, ctx(4)),
      (e: unknown) => e instanceof DomainError && e.code === 'terminal_session'
    );
  });

  it('abandon_session from prepared works', () => {
    const { session } = prepare();
    const abandoned = applyCommand(
      session,
      { type: 'abandon_session', reason: 'user_left' },
      ctx(2)
    );
    assert.equal(abandoned.session.status, 'abandoned');
  });

  it('expectedVersion detects conflict', () => {
    const { session } = prepare();
    assert.throws(
      () =>
        applyCommand(session, { type: 'start_session' }, ctx(2), { expectedVersion: 999 }),
      (e: unknown) => e instanceof DomainError && e.code === 'version_conflict'
    );
  });

  it('ordinals strictly increase along a happy path', () => {
    let s = prepare().session;
    const ordinals = [s.lastEventOrdinal];
    s = applyCommand(s, { type: 'start_session' }, ctx(2)).session;
    ordinals.push(s.lastEventOrdinal);
    s = applyCommand(
      s,
      { type: 'complete_set', weightKg: 80, reps: 8, autoStartRest: false },
      ctx(3)
    ).session;
    ordinals.push(s.lastEventOrdinal);
    for (let i = 1; i < ordinals.length; i++) {
      assert.ok(ordinals[i]! > ordinals[i - 1]!);
    }
  });
});
