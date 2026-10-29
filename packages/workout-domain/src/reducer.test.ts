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
    eventId2: `ev2-${n}`,
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
    assert.equal(afterSet.events[1]?.eventId, 'ev2-3');

    assert.throws(
      () =>
        applyCommand(
          afterSet.session,
          { type: 'complete_set', weightKg: 80, reps: 8 },
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

  it('starts rest after the last set of a step when more steps remain', () => {
    let s = prepare().session;
    s = applyCommand(s, { type: 'start_session' }, ctx(2)).session;

    s = applyCommand(
      s,
      { type: 'complete_set', weightKg: 80, reps: 8, autoStartRest: true },
      ctx(3)
    ).session;
    s = applyCommand(s, { type: 'skip_rest' }, ctx(4)).session;

    const afterLastSetOfStep = applyCommand(
      s,
      { type: 'complete_set', weightKg: 80, reps: 8, autoStartRest: true },
      ctx(5)
    );

    assert.equal(afterLastSetOfStep.session.currentStepIndex, 1);
    assert.ok(afterLastSetOfStep.session.restEndsAtMs !== null);
    assert.equal(
      afterLastSetOfStep.events.map((e) => e.type).join(','),
      'set_completed,rest_started'
    );
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

  it('trace-replay: fixed timestamps yield identical final state', () => {
    const run = () => {
      let s = prepare().session;
      s = applyCommand(s, { type: 'start_session' }, ctx(2)).session;
      s = applyCommand(
        s,
        { type: 'complete_set', weightKg: 80, reps: 8, autoStartRest: false },
        ctx(3)
      ).session;
      s = applyCommand(
        s,
        { type: 'complete_set', weightKg: 80, reps: 7, autoStartRest: false },
        ctx(4)
      ).session;
      s = applyCommand(s, { type: 'complete_session', reason: 'all_sets_done' }, ctx(5)).session;
      return s;
    };
    const a = run();
    const b = run();
    assert.equal(a.status, 'completed');
    assert.deepEqual(
      {
        status: a.status,
        rowVersion: a.rowVersion,
        lastEventOrdinal: a.lastEventOrdinal,
        currentStepIndex: a.currentStepIndex,
        startedAtMs: a.startedAtMs,
        completedAtMs: a.completedAtMs,
        sets0: a.steps[0]?.completedSets.map((x) => ({ reps: x.reps, w: x.weightKg })),
        sets1: a.steps[1]?.completedSets.length
      },
      {
        status: b.status,
        rowVersion: b.rowVersion,
        lastEventOrdinal: b.lastEventOrdinal,
        currentStepIndex: b.currentStepIndex,
        startedAtMs: b.startedAtMs,
        completedAtMs: b.completedAtMs,
        sets0: b.steps[0]?.completedSets.map((x) => ({ reps: x.reps, w: x.weightKg })),
        sets1: b.steps[1]?.completedSets.length
      }
    );
  });
});

describe('workout-domain supersets', () => {
  const ssSteps: SessionStepSnapshot[] = [
    {
      stepIndex: 0,
      exerciseId: 'ex-a1',
      exerciseRevisionId: 'rev-a1',
      name: 'A1',
      targetSets: 2,
      targetReps: 10,
      targetWeightKg: 50,
      restSeconds: 90,
      supersetGroup: 0
    },
    {
      stepIndex: 1,
      exerciseId: 'ex-a2',
      exerciseRevisionId: 'rev-a2',
      name: 'A2',
      targetSets: 2,
      targetReps: 12,
      targetWeightKg: 30,
      restSeconds: 90,
      supersetGroup: 0
    },
    {
      stepIndex: 2,
      exerciseId: 'ex-b',
      exerciseRevisionId: 'rev-b',
      name: 'B',
      targetSets: 1,
      targetReps: 8,
      targetWeightKg: 60,
      restSeconds: 120
    }
  ];

  function prepareSS() {
    return applyCommand(
      null,
      {
        type: 'prepare_session',
        sessionId: 'sess-ss',
        userId: 'user-1',
        templateRevisionId: 'tpl-rev-ss',
        contentHash: 'ss',
        steps: ssSteps,
        localStartDate: '2026-10-29',
        timezone: 'Europe/Moscow'
      },
      ctx(1)
    );
  }

  function startedSS() {
    const s = prepareSS().session;
    return applyCommand(s, { type: 'start_session' }, ctx(2)).session;
  }

  it('разрешает логать не-текущего участника активной суперсет-группы', () => {
    const s = startedSS();
    const result = applyCommand(
      s,
      { type: 'complete_set', stepIndex: 1, weightKg: 30, reps: 12, autoStartRest: true },
      ctx(3)
    );
    assert.equal(result.session.steps[1]?.completedSets.length, 1);
    // Круг не закрыт (A1 ещё без подходов) — без отдыха, текущим остаётся A1.
    assert.equal(result.session.restEndsAtMs, null);
    assert.equal(result.session.currentStepIndex, 0);
  });

  it('отвергает лог в шаг вне активной группы', () => {
    const s = startedSS();
    assert.throws(
      () => applyCommand(s, { type: 'complete_set', stepIndex: 2, weightKg: 60, reps: 8 }, ctx(3)),
      (e: unknown) => e instanceof DomainError && e.code === 'step_out_of_range'
    );
  });

  it('отдых стартует только по закрытию круга группы', () => {
    const s = startedSS();
    const a2 = applyCommand(
      s,
      { type: 'complete_set', stepIndex: 1, weightKg: 30, reps: 12, autoStartRest: true },
      ctx(3)
    );
    assert.equal(a2.session.restEndsAtMs, null);
    const a1 = applyCommand(
      a2.session,
      { type: 'complete_set', stepIndex: 0, weightKg: 50, reps: 10, autoStartRest: true },
      ctx(4)
    );
    assert.ok(a1.session.restEndsAtMs !== null);
  });

  it('после полного закрытия группы текущим становится следующий шаг', () => {
    let s = startedSS();
    s = applyCommand(s, { type: 'complete_set', stepIndex: 0, weightKg: 50, reps: 10, autoStartRest: false }, ctx(3)).session;
    s = applyCommand(s, { type: 'complete_set', stepIndex: 1, weightKg: 30, reps: 12, autoStartRest: false }, ctx(4)).session;
    s = applyCommand(s, { type: 'complete_set', stepIndex: 0, weightKg: 52, reps: 10, autoStartRest: false }, ctx(5)).session;
    // A1 закрыт (2/2), A2 остаётся текущим.
    assert.equal(s.currentStepIndex, 1);
    const done = applyCommand(
      s,
      { type: 'complete_set', stepIndex: 1, weightKg: 30, reps: 12, autoStartRest: true },
      ctx(6)
    );
    assert.equal(done.session.currentStepIndex, 2);
    assert.ok(done.session.restEndsAtMs !== null);
  });

  it('skip_step внутри группы переводит текущий на её следующего участника', () => {
    const s = startedSS();
    const skipped = applyCommand(s, { type: 'skip_step', reason: 'equipment' }, ctx(3));
    assert.equal(skipped.session.steps[0]?.skipped, true);
    assert.equal(skipped.session.currentStepIndex, 1);
  });
});
