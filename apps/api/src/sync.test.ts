import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './index.ts';
import { MemoryIdempotencyStore, MemoryChangeFeed } from './idempotency.ts';

function pushBody(
  overrides: Partial<{
    user_id: string;
    client_operation_id: string;
    device_id: string;
    payload_hash: string;
    aggregate_id: string;
  }> = {},
) {
  return {
    user_id: overrides.user_id ?? 'u1',
    operations: [
      {
        client_operation_id: overrides.client_operation_id ?? 'op1',
        device_id: overrides.device_id ?? 'd1',
        aggregate_type: 'workout_session',
        aggregate_id: overrides.aggregate_id ?? 's1',
        payload_hash: overrides.payload_hash ?? 'b'.repeat(64),
        payload: { event: 'complete_set' },
        occurred_at_client: new Date().toISOString(),
      },
    ],
  };
}

function jsonRequest(body: unknown, token?: string) {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  return { method: 'POST', headers, body: JSON.stringify(body) } as const;
}

describe('sync API', () => {
  let store: MemoryIdempotencyStore;
  let feed: MemoryChangeFeed;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    store = new MemoryIdempotencyStore();
    feed = new MemoryChangeFeed();
    app = createApp({ store, feed, requireUuid: false });
  });

  it('health', async () => {
    const res = await app.request('/health');
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
    assert.equal(body.service, 'fitpulse-api');
    assert.equal(body.auth, 'open');
  });

  it('push accepts valid op and publishes change', async () => {
    const res = await app.request('/api/v1/sync/push', jsonRequest(pushBody()));
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.results[0].status, 'accepted');

    const pull = await app.request('/api/v1/sync/pull?user_id=u1&after_change_id=0');
    assert.equal(pull.status, 200);
    const page = await pull.json();
    assert.equal(page.changes.length, 1);
    assert.equal(page.changes[0].entity_type, 'workout_session');
    assert.equal(page.has_more, false);
  });

  it('push accepts empty operations array', async () => {
    const res = await app.request('/api/v1/sync/push', jsonRequest({ user_id: 'u1', operations: [] }));
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.deepEqual(body.results, []);
  });

  it('push returns duplicate on replay', async () => {
    const body = pushBody();
    const first = await app.request('/api/v1/sync/push', jsonRequest(body));
    assert.equal(first.status, 200);
    assert.equal((await first.json()).results[0].status, 'accepted');

    const second = await app.request('/api/v1/sync/push', jsonRequest(body));
    assert.equal(second.status, 200);
    assert.equal((await second.json()).results[0].status, 'duplicate');
  });

  it('push answers duplicate when the insert loses the race', async () => {
    // Simulate a concurrent winner: put reports inserted=false,
    // the row is already stored, and the feed must NOT get a second entry.
    const body = pushBody();
    const first = await app.request('/api/v1/sync/push', jsonRequest(body));
    assert.equal((await first.json()).results[0].status, 'accepted');

    const originalPut = store.put.bind(store);
    store.put = async (op) => {
      await originalPut(op);
      return { inserted: false };
    };

    const second = await app.request('/api/v1/sync/push', jsonRequest(body));
    const res = await second.json();
    assert.equal(res.results[0].status, 'duplicate');

    const pull = await app.request('/api/v1/sync/pull?user_id=u1&after_change_id=0');
    const page = await pull.json();
    assert.equal(page.changes.length, 1); // no duplicate change appended
  });

  it('push rejects hash mismatch on same client_operation_id', async () => {
    await app.request('/api/v1/sync/push', jsonRequest(pushBody({ payload_hash: 'a'.repeat(64) })));
    const res = await app.request('/api/v1/sync/push', jsonRequest(pushBody({ payload_hash: 'c'.repeat(64) })));
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.results[0].status, 'rejected');
    assert.equal(body.results[0].error_code, 'payload_hash_mismatch');
  });

  it('push rejects short payload_hash', async () => {
    const res = await app.request('/api/v1/sync/push', jsonRequest(pushBody({ payload_hash: 'abc' })));
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.results[0].status, 'rejected');
    assert.equal(body.results[0].error_code, 'invalid_payload_hash');
  });

  it('pull returns empty page without user_id', async () => {
    const res = await app.request('/api/v1/sync/pull?after_change_id=0');
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.deepEqual(body.changes, []);
    assert.equal(body.has_more, false);
  });

  it('pull defaults after_change_id to 0 when omitted', async () => {
    const res = await app.request('/api/v1/sync/pull');
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.deepEqual(body.changes, []);
    assert.equal(body.next_change_id, 0);
  });
});

describe('sync API bearer token', () => {
  const makeApp = () => {
    const store = new MemoryIdempotencyStore();
    const feed = new MemoryChangeFeed();
    return createApp({ store, feed, requireUuid: false, apiToken: 'secret-token' });
  };

  it('rejects sync routes without a token', async () => {
    const app = makeApp();
    const res = await app.request('/api/v1/sync/pull?user_id=u1&after_change_id=0');
    assert.equal(res.status, 401);
  });

  it('rejects a wrong token', async () => {
    const app = makeApp();
    const res = await app.request('/api/v1/sync/push', jsonRequest(pushBody(), 'wrong'));
    assert.equal(res.status, 401);
  });

  it('accepts a valid token', async () => {
    const app = makeApp();
    const res = await app.request('/api/v1/sync/push', jsonRequest(pushBody(), 'secret-token'));
    assert.equal(res.status, 200);
    assert.equal((await res.json()).results[0].status, 'accepted');
  });

  it('keeps /health open', async () => {
    const app = makeApp();
    const res = await app.request('/health');
    assert.equal(res.status, 200);
    assert.equal((await res.json()).auth, 'bearer');
  });
});
