import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, createSign } from 'node:crypto';
import {
  verifyIdToken,
  claimsToAuthSubject,
  clearOidcJwksCache,
  type Jwk,
  type OidcConfig,
} from './oidc.ts';
import { createApp } from './index.ts';
import { MemoryIdempotencyStore, MemoryChangeFeed } from './idempotency.ts';
import { MemoryUserRegistry, verifyJwt } from './auth.ts';

const SECRET = 'oidc-test-secret';
const GOOGLE_AUD = 'google-client-id.apps.googleusercontent.com';
const APPLE_AUD = 'app.fitpulse.web';

let publicJwk: Jwk;
let privateKeyPem: string;
let kid: string;

function b64url(buf: Buffer): string {
  return buf.toString('base64url');
}

function signRs256(header: object, payload: object): string {
  const h = b64url(Buffer.from(JSON.stringify(header)));
  const p = b64url(Buffer.from(JSON.stringify(payload)));
  const data = `${h}.${p}`;
  const signer = createSign('RSA-SHA256');
  signer.update(data);
  signer.end();
  const sig = signer.sign(privateKeyPem);
  return `${data}.${b64url(sig)}`;
}

before(() => {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
  });
  privateKeyPem = privateKey.export({ type: 'pkcs1', format: 'pem' }) as string;
  const jwk = publicKey.export({ format: 'jwk' }) as Jwk;
  kid = 'test-kid-1';
  publicJwk = { ...jwk, kid, alg: 'RS256', use: 'sig' };
  clearOidcJwksCache();
});

function cfg(overrides: Partial<OidcConfig> = {}): OidcConfig {
  return {
    googleClientId: GOOGLE_AUD,
    appleClientId: APPLE_AUD,
    fetchJwks: async () => [publicJwk],
    nowSeconds: () => 1_700_000_000,
    ...overrides,
  };
}

describe('claimsToAuthSubject', () => {
  it('prefers verified email', () => {
    assert.equal(
      claimsToAuthSubject('google', {
        sub: '123',
        email: 'Alice@Example.com',
        email_verified: true,
        iss: 'https://accounts.google.com',
        aud: GOOGLE_AUD,
        exp: 9e9,
      }),
      'alice@example.com',
    );
  });

  it('falls back to oidc:provider:sub', () => {
    assert.equal(
      claimsToAuthSubject('google', {
        sub: 'abc-sub',
        email: 'nope@x.com',
        email_verified: false,
        iss: 'https://accounts.google.com',
        aud: GOOGLE_AUD,
        exp: 9e9,
      }),
      'oidc:google:abc-sub',
    );
  });
});

describe('verifyIdToken', () => {
  it('accepts a valid Google ID token', async () => {
    const token = signRs256(
      { alg: 'RS256', typ: 'JWT', kid },
      {
        iss: 'https://accounts.google.com',
        aud: GOOGLE_AUD,
        sub: 'g-sub-1',
        email: 'user@gmail.com',
        email_verified: true,
        exp: 1_700_000_000 + 3600,
        iat: 1_700_000_000,
      },
    );
    const claims = await verifyIdToken('google', token, cfg());
    assert.equal(claims.sub, 'g-sub-1');
    assert.equal(claims.email, 'user@gmail.com');
  });

  it('rejects expired tokens', async () => {
    const token = signRs256(
      { alg: 'RS256', typ: 'JWT', kid },
      {
        iss: 'https://accounts.google.com',
        aud: GOOGLE_AUD,
        sub: 'g-sub-1',
        exp: 1_700_000_000 - 10,
      },
    );
    await assert.rejects(
      () => verifyIdToken('google', token, cfg()),
      (e: Error & { code?: string }) => e.code === 'expired',
    );
  });

  it('rejects wrong audience', async () => {
    const token = signRs256(
      { alg: 'RS256', typ: 'JWT', kid },
      {
        iss: 'https://accounts.google.com',
        aud: 'other-client',
        sub: 'g-sub-1',
        exp: 1_700_000_000 + 3600,
      },
    );
    await assert.rejects(
      () => verifyIdToken('google', token, cfg()),
      (e: Error & { code?: string }) => e.code === 'audience_mismatch',
    );
  });

  it('rejects bad signature', async () => {
    const token = signRs256(
      { alg: 'RS256', typ: 'JWT', kid },
      {
        iss: 'https://accounts.google.com',
        aud: GOOGLE_AUD,
        sub: 'g-sub-1',
        exp: 1_700_000_000 + 3600,
      },
    );
    const parts = token.split('.');
    const bad = `${parts[0]}.${parts[1]}.${'AA'.repeat(32)}`;
    await assert.rejects(
      () => verifyIdToken('google', bad, cfg()),
      (e: Error & { code?: string }) => e.code === 'invalid_token',
    );
  });

  it('accepts Apple issuer', async () => {
    const token = signRs256(
      { alg: 'RS256', typ: 'JWT', kid },
      {
        iss: 'https://appleid.apple.com',
        aud: APPLE_AUD,
        sub: 'apple-sub',
        email: 'hidden@privaterelay.appleid.com',
        exp: 1_700_000_000 + 3600,
      },
    );
    const claims = await verifyIdToken('apple', token, cfg());
    assert.equal(claims.sub, 'apple-sub');
  });
});

describe('POST /api/v1/auth/oidc', () => {
  function app() {
    return createApp({
      store: new MemoryIdempotencyStore(),
      feed: new MemoryChangeFeed(),
      requireUuid: false,
      jwtSecret: SECRET,
      registerUser: new MemoryUserRegistry(),
      oidcConfig: cfg(),
    });
  }

  it('exchanges Google ID token for app JWT', async () => {
    const idToken = signRs256(
      { alg: 'RS256', typ: 'JWT', kid },
      {
        iss: 'https://accounts.google.com',
        aud: GOOGLE_AUD,
        sub: 'g-sub-42',
        email: 'oidc-user@gmail.com',
        email_verified: true,
        exp: 1_700_000_000 + 3600,
      },
    );
    const res = await app().request('/api/v1/auth/oidc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ provider: 'google', id_token: idToken }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.auth_subject, 'oidc-user@gmail.com');
    assert.equal(body.provider, 'google');
    assert.equal(body.created, true);
    assert.equal(verifyJwt(SECRET, body.token), body.user_id);

    const again = await app().request('/api/v1/auth/oidc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ provider: 'google', id_token: idToken }),
    });
    const body2 = await again.json();
    assert.equal(body2.user_id, body.user_id);
    assert.equal(body2.created, false);
  });

  it('returns 400 for unknown provider', async () => {
    const res = await app().request('/api/v1/auth/oidc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ provider: 'facebook', id_token: 'x'.repeat(40) }),
    });
    assert.equal(res.status, 400);
  });
});
