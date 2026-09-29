import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { SyncPushRequest, SyncPullResponse } from './types.ts';

describe('sync-contract shapes', () => {
  it('accepts a minimal push request', () => {
    const req: SyncPushRequest = {
      user_id: '00000000-0000-0000-0000-000000000001',
      operations: [
        {
          client_operation_id: '00000000-0000-7000-8000-0000000000aa',
          device_id: '00000000-0000-0000-0000-0000000000d1',
          aggregate_type: 'workout_session',
          aggregate_id: '00000000-0000-0000-0000-0000000000s1',
          payload_hash: 'a'.repeat(64),
          payload: { event_type: 'complete_set' },
          occurred_at_client: new Date().toISOString(),
        },
      ],
    };
    assert.equal(req.operations.length, 1);
    assert.equal(req.operations[0].payload_hash.length, 64);
  });

  it('accepts an empty pull page', () => {
    const res: SyncPullResponse = {
      changes: [],
      next_change_id: 0,
      has_more: false,
    };
    assert.equal(res.changes.length, 0);
  });
});
