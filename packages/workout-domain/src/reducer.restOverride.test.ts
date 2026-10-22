import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { applyCommand } from './reducer.ts';
import type { CommandContext, SessionStepSnapshot } from './types.ts';

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

function activeSession() {
  const prepared = applyCommand(
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
  return applyCommand(prepared.session, { type: 'start_session' }, ctx(2)).session;
}

describe('complete_set restSecondsOverride (Fud AI presets)', () => {
  it('uses plan restSeconds when override is undefined', () => {
    const after = applyCommand(
      activeSession(),
      { type: 'complete_set', weightKg: 80, reps: 8, autoStartRest: true },
      ctx(3)
    );
    assert.equal(after.session.restEndsAtMs, ctx(3).nowMs + 90_000);
    assert.equal(after.events.map((e) => e.type).join(','), 'set_completed,rest_started');
  });

  it('uses a fixed override instead of the plan value', () => {
    const after = applyCommand(
      activeSession(),
      {
        type: 'complete_set',
        weightKg: 80,
        reps: 8,
        autoStartRest: true,
        restSecondsOverride: 120
      },
      ctx(3)
    );
    assert.equal(after.session.restEndsAtMs, ctx(3).nowMs + 120_000);
  });

  it('null override disables rest entirely', () => {
    const after = applyCommand(
      activeSession(),
      {
        type: 'complete_set',
        weightKg: 80,
        reps: 8,
        autoStartRest: true,
        restSecondsOverride: null
      },
      ctx(3)
    );
    assert.equal(after.session.restEndsAtMs, null);
    assert.equal(after.events.map((e) => e.type).join(','), 'set_completed');
  });
});
