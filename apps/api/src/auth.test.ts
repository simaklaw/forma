import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './index.ts';
import { MemoryIdempotencyStore, MemoryChangeFeed } from './idempotency.ts';
import {
  signJwt,
  verifyJwt,
  subjectUserId,
  MemoryUserRegistry,
  JWT_TTL_SECONDS,
} from './auth.ts';

const SECRET = 'test-jwt-secret';

function jwtApp() {
  return createApp({
    store: new MemoryIdempotencyStore(),
    feed: new MemoryChangeFeed(),
    requireUuid: false,
    jwtSecret: SECRET,
    registerUser: new MemoryUserRegistry(),
  });
}

type JwtApp = ReturnType<typeof jwtApp>;

async function register(app: JwtApp, subject: string) {
  const res = await app.request('/api/v1/auth/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ auth_subject: subject }),
  });
  return { status: res.status, body: await res.json() };
}

function pushBody(userId: string) {
  return {
    user_id: userId,
    operations: [
      {
        client_operation_id: 'op-jwt-1',
        device_id: 'd1',
        aggregate_type: 'workout_session',
        aggregate_id: 's1',
        payload_hash: 'a'.repeat(64),
        payload: { event: 'complete_set' },
        occurred_at_client: new Date().toISOString(),
      },
    ],
  };
}

function req(body: unknown, token?: string) {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  return { method: 'POST', headers, body: JSON.stringify(body) } as const;
}

describe('auth primitives', () => {
  it('subjectUserId is a deterministic UUIDv5', () => {
    const a = subjectUserId('alice@example.com');
    const b = subjectUserId('alice@example.com');
    const c = subjectUserId('bob@example.com');
    assert.equal(a, b);
    assert.notEqual(a, c);
    assert.match(
      a,
      /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it('JWT sign/verify roundtrip', () => {
    const token = signJwt(SECRET, 'u1');
    assert.equal(verifyJwt(SECRET, token), 'u1');
  });

  it('JWT rejects tampering, wrong secret and expiry', () => {
    const token = signJwt(SECRET, 'u1');
    const parts = token.split('.');
    const tampered = `${parts[0]}.${parts[1}.deadbeef`;
    assert.equal(verifyJwt(SECRET, tampered), null);
    assert.equal(verifyJwt('other-secret', token), null);
    const now = Math.floor(Date.now() / 1000);
    const expired = signJwt(SECRET, 'u1', now - JWT_TTL_SECONDS - 10);
    assert.equal(verifyJwt(SECRET, expired), null);
  });
});

describe('sync API in JWT mode', () => {
  it('health reports jwt auth', async () => {
    const app = jwtApp();
    const res = await app.request('/health');
    assert.equal((await res.json()).auth, 'jwt');
  });

  it('register returns a stable user_id and a working token', async () => {
    const app = jwtApp();
    const first = await register(app, 'alice@example.com');
    assert.equal(first.status, 200);
    assert.equal(first.body.created, true);
    const second = await register(app, 'alice@example.com');
    assert.equal(second.status, 200);
    assert.equal(second.body.user_id, first.body.user_id);
    assert.equal(second.body.created, false);
    assert.equal(verifyJwt(SECRET, first.body.token), first.body.user_id);
  });

  it('register rejects short subjects', async () => {
    const app = jwtApp();
    const res = await register(app, 'ab');
    assert.equal(res.status, 400);
  });

  it('sync rejects missing/invalid token with 401', async () => {
    const app = jwtApp();
    const reg = (await register(app, 'alice@example.com')).body;
    const noToken = await app.request('/api/v1/sync/push', req(pushBody(reg.user_id)));
    assert.equal(noToken.status, 401);
    const badToken = await app.request(
      '/api/v1/sync/push',
      req(pushBody(reg.user_id), 'not-a-jwt'),
    );
    assert.equal(badToken.status, 401);
  });

  it('push with matching user_id is accepted; mismatch is 403', async () => {
    const app = jwtApp();
    const alice = (await register(app, 'alice@example.com')).body;
    const bob = (await register(app, 'bob@example.com')).body;

    const ok = await app.request(
      '/api/v1/sync/push',
      req(pushBody(alice.user_id), alice.token),
    );
    assert.equal(ok.status, 200);
    assert.equal((await ok.json()).results[0].status, 'accepted');

    const mismatch = await app.request(
      '/api/v1/sync/push',
      req(pushBody(bob.user_id), alice.token),
    );
    assert.equal(mismatch.status, 403);
  });

  it('pull isolates users and rejects spoofed user_id', async () => {
    const app = jwtApp();
    const alice = (await register(app, 'alice@example.com')).body;
    const bob = (await register(app, 'bob@example.com')).body;

    await app.request('/api/v1/sync/push', req(pushBody(alice.user_id), alice.token));

    const asAlice = await app.request(
      `/api/v1/sync/pull?user_id=${alice.user_id}&after_change_id=0`,
      { headers: { authorization: `Bearer ${alice.token}` } },
    );
    assert.equal((await asAlice.json()).changes.length, 1);

    const asBob = await app.request(
      `/api/v1/sync/pull?user_id=${bob.user_id}&after_change_id=0`,
      { headers: { authorization: `Bearer ${bob.token}` } },
    );
    assert.equal((await asBob.json()).changes.length, 0);

    const spoof = await app.request(
      `/api/v1/sync/pull?user_id=${alice.user_id}&after_change_id=0`,
      { headers: { authorization: `Bearer ${bob.token}` } },
    );
    assert.equal(spoof.status, 403);
  });

  it('pull without user_id uses the token subject', async () => {
    const app = jwtApp();
    const alice = (await register(app, 'alice@example.com')).body;
    await app.request('/api/v1/sync/push', req(pushBody(alice.user_id), alice.token));
    const res = await app.request('/api/v1/sync/pull?after_change_id=0', {
      headers: { authorization: `Bearer ${alice.token}` },
    });
    assert.equal(res.status, 200);
    assert.equal((await res.json()).changes.length, 1);
  });
});
