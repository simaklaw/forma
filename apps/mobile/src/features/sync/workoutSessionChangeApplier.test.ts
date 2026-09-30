import { createWorkoutSessionChangeApplier } from './workoutSessionChangeApplier';
import type { PullChange } from './syncPullService';

function change(overrides: Partial<PullChange> = {}): PullChange {
  return {
    change_id: 1,
    entity_type: 'workout_session',
    entity_id: 's1',
    entity_version: 1,
    mutation: 'upsert',
    payload: {
      projection: {
        setLogs: [{ id: 'log1', exerciseId: 1, dateKey: '2026-09-30' }],
        dayProgress: { '2026-09-30': { '1': 1 } },
      },
    },
    ...overrides,
  };
}

describe('workoutSessionChangeApplier', () => {
  it('applies a valid session projection', () => {
    const seen: unknown[] = [];
    const applier = createWorkoutSessionChangeApplier((p) => seen.push(p));
    expect(applier.apply(change())).toBe(true);
    expect(seen).toHaveLength(1);
  });

  it('skips non-workout entities', () => {
    const applier = createWorkoutSessionChangeApplier(() => undefined);
    expect(applier.apply(change({ entity_type: 'nutrition_log' }))).toBe(false);
  });

  it('acknowledges tombstones without applying', () => {
    const seen: unknown[] = [];
    const applier = createWorkoutSessionChangeApplier((p) => seen.push(p));
    expect(applier.apply(change({ mutation: 'tombstone' }))).toBe(true);
    expect(seen).toHaveLength(0);
  });

  it('skips payloads without a valid projection', () => {
    const applier = createWorkoutSessionChangeApplier(() => undefined);
    expect(applier.apply(change({ payload: { event_id: 'x' } }))).toBe(false);
    expect(applier.apply(change({ payload: { projection: { setLogs: 'nope' } } }))).toBe(false);
    expect(applier.apply(change({ payload: {} }))).toBe(false);
  });
});
