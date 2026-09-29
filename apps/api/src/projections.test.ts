import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  NoopProjectionService,
  MemoryProjectionService,
  shouldGrantActivityCredit,
  extractLocalDate,
  ACTIVITY_CREDIT_POLICY_VERSION,
} from './projections.ts';

describe('shouldGrantActivityCredit', () => {
  it('true for completed workout_session', () => {
    assert.equal(
      shouldGrantActivityCredit({
        user_id: 'u',
        aggregate_type: 'workout_session',
        aggregate_id: 's',
        payload: { status: 'completed' },
      }),
      true,
    );
  });

  it('true for abandon_session event', () => {
    assert.equal(
      shouldGrantActivityCredit({
        user_id: 'u',
        aggregate_type: 'workout_session',
        aggregate_id: 's',
        payload: { event: 'abandon_session' },
      }),
      true,
    );
  });

  it('false for complete_set', () => {
    assert.equal(
      shouldGrantActivityCredit({
        user_id: 'u',
        aggregate_type: 'workout_session',
        aggregate_id: 's',
        payload: { event: 'complete_set' },
      }),
      false,
    );
  });

  it('false for non-session aggregate', () => {
    assert.equal(
      shouldGrantActivityCredit({
        user_id: 'u',
        aggregate_type: 'food_entry',
        aggregate_id: 'f',
        payload: { status: 'completed' },
      }),
      false,
    );
  });
});

describe('extractLocalDate', () => {
  it('reads local_date', () => {
    assert.equal(extractLocalDate({ local_date: '2026-09-28' }), '2026-09-28');
  });

  it('returns null when no local date is present (no UTC fallback)', () => {
    assert.equal(extractLocalDate({}), null);
    assert.equal(extractLocalDate({ local_date: 123 }), null);
  });
});

describe('NoopProjectionService', () => {
  it('onAccepted resolves', async () => {
    const s = new NoopProjectionService();
    await assert.doesNotReject(() =>
      s.onAccepted({
        user_id: 'u',
        aggregate_type: 'workout_session',
        aggregate_id: 's',
        payload: {},
      }),
    );
  });
});

describe('MemoryProjectionService', () => {
  it('grants one credit per session on complete', async () => {
    const s = new MemoryProjectionService();
    const input = {
      user_id: 'u1',
      aggregate_type: 'workout_session',
      aggregate_id: 'sess-1',
      payload: { status: 'completed', local_date: '2026-09-29' },
    };
    await s.onAccepted(input);
    await s.onAccepted(input); // idempotent
    assert.equal(s.credits.length, 1);
    assert.equal(s.credits[0].source_entity_id, 'sess-1');
    assert.equal(s.credits[0].local_date, '2026-09-29');
    assert.equal(s.credits[0].policy_version, ACTIVITY_CREDIT_POLICY_VERSION);
  });

  it('skips credit when payload has no local date', async () => {
    const s = new MemoryProjectionService();
    await s.onAccepted({
      user_id: 'u1',
      aggregate_type: 'workout_session',
      aggregate_id: 'sess-no-date',
      payload: { status: 'completed' },
    });
    assert.equal(s.credits.length, 0);
  });

  it('ignores intermediate complete_set', async () => {
    const s = new MemoryProjectionService();
    await s.onAccepted({
      user_id: 'u1',
      aggregate_type: 'workout_session',
      aggregate_id: 'sess-2',
      payload: { event: 'complete_set' },
    });
    assert.equal(s.credits.length, 0);
  });

  it('tracks max_load soft records from payload.sets', async () => {
    const s = new MemoryProjectionService();
    await s.onAccepted({
      user_id: 'u1',
      aggregate_type: 'workout_session',
      aggregate_id: 'sess-3',
      payload: {
        status: 'completed',
        local_date: '2026-09-29',
        sets: [
          { exercise_id: 1, load_kg: 80 },
          { exercise_id: 1, load_kg: 90 },
          { exercise_id: 2, weight: 40 },
        ],
      },
    });
    assert.equal(s.records.length, 2);
    const squat = s.records.find((r) => r.exercise_key === '1');
    assert.equal(squat?.value, 90);
  });
});
