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
const MAILRU_AUD = 'mailru-client-id-test';
const VK_APP = '51812311';

let publicJwk: Jwk;
let privateKeyPem: string;
let publicKeyPem: string;
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
  publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }) as string;
  const jwk = publicKey.export({ format: 'jwk' }) as Jwk;
  kid = 'test-kid-1';
  publicJwk = { ...jwk, kid, alg: 'RS256', use: 'sig' };
  clearOidcJwksCache();
});

function cfg(overrides: Partial<OidcConfig> = {}): OidcConfig {
  return {
    mailruClientId: MAILRU_AUD,
    vkClientId: VK_APP,
    vkPublicKeyPem: publicKeyPem,
    fetchJwks: async () => [publicJwk],
    nowSeconds: () => 1_700_000_000,
    ...overrides,
  };
}

describe('claimsToAuthSubject', () => {
  it('prefers email for mailru', () => {
    assert.equal(
      claimsToAuthSubject('mailru', {
        sub: '123',
        email: 'User@Mail.ru',
        iss: 'https://account.mail.ru',
        aud: MAILRU_AUD,
        exp: 9e9,
      }),
      'user@mail.ru',
    );
  });

  it('falls back to oidc:provider:sub', () => {
    assert.equal(
      claimsToAuthSubject('vk', {
        sub: '987654',
        iis: 'VK',
        app: VK_APP,
        exp: 9e9,
      }),
      'oidc:vk:987654',
    );
  });
});

describe('verifyIdToken mailru', () => {
  it('accepts a valid Mail.ru ID token', async () => {
    const token = signRs256(
      { alg: 'RS256', typ: 'JWT', kid },
      {
        iss: 'https://account.mail.ru',
        aud: MAILRU_AUD,
        sub: 'mr-sub-1',
        email: 'user@mail.ru',
        email_verified: true,
        exp: 1_700_000_000 + 3600,
        iat: 1_700_000_000,
      },
    );
    const claims = await verifyIdToken('mailru', token, cfg());
    assert.equal(claims.sub, 'mr-sub-1');
    assert.equal(claims.email, 'user@mail.ru');
  });

  it('rejects wrong audience', async () => {
    const token = signRs256(
      { alg: 'RS256', typ: 'JWT', kid },
      {
        iss: 'https://account.mail.ru',
        aud: 'other',
        sub: 'mr-sub-1',
        exp: 1_700_000_000 + 3600,
      },
    );
    await assert.rejects(
      () => verifyIdToken('mailru', token, cfg()),
      (e: Error & { code?: string }) => e.code === 'audience_mismatch',
    );
  });
});

describe('verifyIdToken vk', () => {
  it('accepts a valid VK ID token (iis + app)', async () => {
    const token = signRs256(
      { alg: 'RS256', typ: 'JWT' },
      {
        iis: 'VK',
        sub: 424242,
        app: Number(VK_APP),
        exp: 1_700_000_000 + 3600,
        iat: 1_700_000_000,
      },
    );
    const claims = await verifyIdToken('vk', token, cfg());
    assert.equal(claims.sub, '424242');
  });

  it('rejects wrong app id', async () => {
    const token = signRs256(
      { alg: 'RS256', typ: 'JWT' },
      {
        iis: 'VK',
        sub: '1',
        app: 999,
        exp: 1_700_000_000 + 3600,
      },
    );
    await assert.rejects(
      () => verifyIdToken('vk', token, cfg()),
      (e: Error & { code?: string }) => e.code === 'audience_mismatch',
    );
  });

  it('rejects expired', async () => {
    const token = signRs256(
      { alg: 'RS256', typ: 'JWT' },
      {
        iis: 'VK',
        sub: '1',
        app: Number(VK_APP),
        exp: 1_700_000_000 - 10,
      },
    );
    await assert.rejects(
      () => verifyIdToken('vk', token, cfg()),
      (e: Error & { code?: string }) => e.code === 'expired',
    );
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

  it('exchanges Mail.ru ID token for app JWT', async () => {
    const idToken = signRs256(
      { alg: 'RS256', typ: 'JWT', kid },
      {
        iss: 'https://account.mail.ru',
        aud: MAILRU_AUD,
        sub: 'mr-42',
        email: 'oidc-user@mail.ru',
        email_verified: true,
        exp: 1_700_000_000 + 3600,
      },
    );
    const res = await app().request('/api/v1/auth/oidc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ provider: 'mailru', id_token: idToken }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.auth_subject, 'oidc-user@mail.ru');
    assert.equal(body.provider, 'mailru');
    assert.equal(verifyJwt(SECRET, body.token), body.user_id);
  });

  it('exchanges VK ID token for app JWT', async () => {
    const idToken = signRs256(
      { alg: 'RS256', typ: 'JWT' },
      {
        iis: 'VK',
        sub: 777,
        app: Number(VK_APP),
        exp: 1_700_000_000 + 3600,
      },
    );
    const res = await app().request('/api/v1/auth/oidc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ provider: 'vk', id_token: idToken }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.auth_subject, 'oidc:vk:777');
    assert.equal(body.provider, 'vk');
  });

  it('returns 400 for google/apple', async () => {
    for (const provider of ['google', 'apple', 'facebook']) {
      const res = await app().request('/api/v1/auth/oidc', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ provider, id_token: 'x'.repeat(40) }),
      });
      assert.equal(res.status, 400, provider);
    }
  });
});
