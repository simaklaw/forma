import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './index.ts';
import { MemoryIdempotencyStore, MemoryChangeFeed } from './idempotency.ts';
import {
  authRegisterSchema,
  oidcAuthSchema,
  syncPushRequestSchema,
  syncPushOperationSchema,
  parseOr400,
} from './validation.ts';

function openApp() {
  return createApp({
    store: new MemoryIdempotencyStore(),
    feed: new MemoryChangeFeed(),
    requireUuid: false,
  });
}

type OpenApp = ReturnType<typeof openApp>;

async function postJson(app: OpenApp, path: string, body: unknown) {
  const res = await app.request(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return {
    status: res.status,
    body: (await res.json()) as Record<string, unknown>,
  };
}

describe('zod schemas', () => {
  it('authRegisterSchema accepts a valid subject and rejects a short one', () => {
    assert.equal(
      authRegisterSchema.safeParse({ auth_subject: 'alice@example.com' })
        .success,
      true,
    );
    assert.equal(
      authRegisterSchema.safeParse({ auth_subject: 'ab' }).success,
      false,
    );
  });

  it('oidcAuthSchema accepts provider + id_token strings, rejects non-strings', () => {
    assert.equal(
      oidcAuthSchema.safeParse({ provider: 'mailru', id_token: 't'.repeat(40) })
        .success,
      true,
    );
    assert.equal(oidcAuthSchema.safeParse({ provider: 42 }).success, false);
  });

  it('syncPushRequestSchema keeps partial operations valid (per-op rejection happens in the handler)', () => {
    const r = syncPushRequestSchema.safeParse({
      user_id: 'u1',
      operations: [{ client_operation_id: 'op-1' }],
    });
    assert.equal(r.success, true);
  });

  it('syncPushRequestSchema rejects a missing operations array and non-string user_id', () => {
    assert.equal(
      syncPushRequestSchema.safeParse({ user_id: 'u1' }).success,
      false,
    );
    assert.equal(
      syncPushRequestSchema.safeParse({ user_id: 42, operations: [] }).success,
      false,
    );
  });

  it('syncPushOperationSchema documents the full operation shape', () => {
    assert.equal(
      syncPushOperationSchema.safeParse({
        client_operation_id: 'op1',
        device_id: 'd1',
        aggregate_type: 'workout_session',
        aggregate_id: 's1',
        payload_hash: 'a'.repeat(64),
        payload: { event: 'complete_set' },
        occurred_at_client: '2026-01-01T00:00:00.000Z',
      }).success,
      true,
    );
    assert.equal(
      syncPushOperationSchema.safeParse({
        client_operation_id: 'op1',
        device_id: 'd1',
        aggregate_type: 'workout_session',
        aggregate_id: 's1',
        payload_hash: 'zzz',
        payload: {},
        occurred_at_client: '2026-01-01T00:00:00.000Z',
      }).success,
      false,
    );
  });
});

describe('parseOr400', () => {
  it('returns data on success', () => {
    const r = parseOr400(
      authRegisterSchema,
      { auth_subject: 'alice' },
      'code',
      'msg',
    );
    assert.equal(r.ok, true);
  });

  it('returns the error code and per-field issues on failure', () => {
    const r = parseOr400(
      authRegisterSchema,
      {},
      'invalid_auth_subject',
      'msg',
    );
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.body.error, 'invalid_auth_subject');
      assert.equal(r.body.message, 'msg');
      assert.ok(Array.isArray(r.body.issues));
      const issue = r.body.issues[0];
      assert.ok(issue);
      assert.equal(typeof issue.path, 'string');
      assert.equal(typeof issue.code, 'string');
      assert.equal(typeof issue.message, 'string');
    }
  });
});

describe('HTTP boundary uses the schemas', () => {
  it('push without operations returns invalid_body with issues', async () => {
    const res = await postJson(openApp(), '/api/v1/sync/push', {
      user_id: 'u1',
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'invalid_body');
    assert.ok(Array.isArray(res.body.issues));
    assert.ok((res.body.issues as unknown[]).length > 0);
  });

  it('push with a non-string user_id is rejected instead of accepted', async () => {
    const res = await postJson(openApp(), '/api/v1/sync/push', {
      user_id: 42,
      operations: [],
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'invalid_body');
  });

  it('push with a null operation element returns 400 instead of a 500', async () => {
    const res = await postJson(openApp(), '/api/v1/sync/push', {
      user_id: 'u1',
      operations: [null],
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'invalid_body');
  });

  it('openapi.json is served and lists all routes', async () => {
    const res = await openApp().request('/api/openapi.json');
    assert.equal(res.status, 200);
    const doc = (await res.json()) as {
      openapi: string;
      paths: Record<string, unknown>;
    };
    assert.equal(doc.openapi, '3.1.0');
    for (const p of [
      '/health',
      '/api/v1/auth/register',
      '/api/v1/auth/oidc',
      '/api/v1/sync/push',
      '/api/v1/sync/pull',
    ]) {
      assert.ok(doc.paths[p], 'missing path ' + p);
    }
  });
});
