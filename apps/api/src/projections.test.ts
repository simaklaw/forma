import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NoopProjectionService } from './projections.ts';

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
