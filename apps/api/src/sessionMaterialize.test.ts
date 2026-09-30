import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  mapSessionStatus,
  extractStatus,
  detUuid,
  parseSetLogsFromPayload,
  planStepsFromSetLogs,
} from './sessionMaterialize.ts';

describe('mapSessionStatus', () => {
  it('passes through enum values', () => {
    assert.equal(mapSessionStatus('completed'), 'completed');
    assert.equal(mapSessionStatus('abandoned'), 'abandoned');
    assert.equal(mapSessionStatus('paused'), 'paused');
  });

  it('maps partial / left aliases', () => {
    assert.equal(mapSessionStatus('user_finished_partial'), 'completed');
    assert.equal(mapSessionStatus('user_left'), 'abandoned');
    assert.equal(mapSessionStatus('finish_partial'), 'completed');
  });

  it('defaults unknown to completed', () => {
    assert.equal(mapSessionStatus('weird'), 'completed');
    assert.equal(mapSessionStatus(null), 'completed');
  });
});

describe('extractStatus', () => {
  it('prefers status field', () => {
    assert.equal(
      extractStatus({ status: 'paused', event: 'complete_session' }),
      'paused',
    );
  });
});

describe('detUuid', () => {
  it('is stable for same inputs', () => {
    const a = detUuid('ns', 'name');
    const b = detUuid('ns', 'name');
    assert.equal(a, b);
    assert.match(a, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it('differs for different names', () => {
    assert.notEqual(detUuid('ns', 'a'), detUuid('ns', 'b'));
  });
});

describe('parseSetLogsFromPayload + planStepsFromSetLogs', () => {
  it('groups projection.setLogs by exercise', () => {
    const logs = parseSetLogsFromPayload({
      projection: {
        setLogs: [
          { exerciseId: 1, weight: 40, reps: 10 },
          { exerciseId: 1, weight: 45, reps: 8 },
          { exerciseId: 7, weight: 80, reps: 5 },
        ],
      },
    });
    assert.equal(logs.length, 3);
    const plans = planStepsFromSetLogs(logs);
    assert.equal(plans.length, 2);
    assert.equal(plans[0].exerciseKey, '1');
    assert.equal(plans[0].sets.length, 2);
    assert.equal(plans[1].exerciseKey, '7');
  });

  it('returns empty for empty setLogs', () => {
    const logs = parseSetLogsFromPayload({
      projection: { setLogs: [] },
    });
    assert.equal(logs.length, 0);
    assert.equal(planStepsFromSetLogs(logs).length, 0);
  });
});
