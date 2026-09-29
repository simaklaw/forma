import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { app } from './index.ts';

describe('sync API skeleton', () => {
  it('health', async () => {
    const res = await app.request('/health');
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
  });

  it('push accepts valid op', async () => {
    const res = await app.request('/api/v1/sync/push', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        user_id: 'u1',
        operations: [
          {
            client_operation_id: 'op1',
            device_id: 'd1',
            aggregate_type: 'workout_session',
            aggregate_id: 's1',
            payload_hash: 'b'.repeat(64),
            payload: {},
            occurred_at_client: new Date().toISOString(),
          },
        ],
      }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.results[0].status, 'accepted');
  });

  it('pull returns empty page', async () => {
    const res = await app.request('/api/v1/sync/pull?after_change_id=0');
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.deepEqual(body.changes, []);
    assert.equal(body.has_more, false);
  });
});
