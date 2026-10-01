import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, createSign } from 'node:crypto';
import {
  verifyIdToken,
  claimsToAuthSubject,
  clearOidcJwksCache,
  exchangeMailruAuthorizationCode,
  isAllowedOidcRedirectUri,
  OidcError,
  type Jwk,
  type OidcConfig,
} from './oidc.ts';
import { createApp } from './index.ts';
import { MemoryIdempotencyStore, MemoryChangeFeed } from './idempotency.ts';
import { MemoryUserRegistry, verifyJwt } from './auth.ts';

/** Unit-test only — never used outside node:test. */
const TEST_JWT_SECRET = 'test-only-jwt-secret-not-for-prod';
const MAILRU_AUD = 'mailru-client-test';
const VK_APP = '123456';

let publicKeyPem: string;
let privateKeyPem: string;
let publicJwk: Jwk;
let kid: string;

before(() => {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
  });
  publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }) as string;
  privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;
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

function signRs256(header: object, payload: object): string {
  const h = Buffer.from(JSON.stringify(header)).toString('base64url');
  const p = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const data = `${h}.${p}`;
  const signer = createSign('RSA-SHA256');
  signer.update(data);
  signer.end();
  const sig = signer.sign(privateKeyPem).toString('base64url');
  return `${data}.${sig}`;
}

function app() {
  return createApp({
    store: new MemoryIdempotencyStore(),
    feed: new MemoryChangeFeed(),
    jwtSecret: TEST_JWT_SECRET,
    registerUser: new MemoryUserRegistry(),
    oidcConfig: cfg({ mailruClientSecret: 'test-secret' }),
  });
}

describe('claimsToAuthSubject', () => {
  it('prefers email for mailru', () => {
    assert.equal(
      claimsToAuthSubject('mailru', {
        sub: '1',
        email: 'User@Mail.RU',
        email_verified: true,
        exp: 9e9,
      }),
      'user@mail.ru',
    );
  });

  it('falls back to oidc:provider:sub', () => {
    assert.equal(
      claimsToAuthSubject('vk', { sub: '42', exp: 9e9 }),
      'oidc:vk:42',
    );
  });
});

describe('verifyIdToken mailru', () => {
  it('accepts a valid Mail.ru ID token', async () => {
    const idToken = signRs256(
      { alg: 'RS256', typ: 'JWT', kid },
      {
        iss: 'https://account.mail.ru',
        sub: 'u1',
        aud: MAILRU_AUD,
        email: 'oidc-user@mail.ru',
        email_verified: true,
        exp: 1_700_000_000 + 3600,
      },
    );
    const claims = await verifyIdToken('mailru', idToken, cfg());
    assert.equal(claims.sub, 'u1');
  });

  it('rejects wrong audience', async () => {
    const idToken = signRs256(
      { alg: 'RS256', typ: 'JWT', kid },
      {
        iss: 'https://account.mail.ru',
        sub: 'u1',
        aud: 'other',
        exp: 1_700_000_000 + 3600,
      },
    );
    await assert.rejects(
      () => verifyIdToken('mailru', idToken, cfg()),
      (e: unknown) => e instanceof OidcError && e.code === 'audience_mismatch',
    );
  });
});

describe('verifyIdToken vk', () => {
  it('accepts a valid VK ID token (iis + app)', async () => {
    const idToken = signRs256(
      { alg: 'RS256', typ: 'JWT' },
      {
        iis: 'VK',
        sub: 777,
        app: Number(VK_APP),
        exp: 1_700_000_000 + 3600,
      },
    );
    const claims = await verifyIdToken('vk', idToken, cfg());
    assert.equal(claims.sub, '777');
  });

  it('rejects wrong app id', async () => {
    const idToken = signRs256(
      { alg: 'RS256', typ: 'JWT' },
      { iis: 'VK', sub: 1, app: 999, exp: 1_700_000_000 + 3600 },
    );
    await assert.rejects(
      () => verifyIdToken('vk', idToken, cfg()),
      (e: unknown) => e instanceof OidcError && e.code === 'audience_mismatch',
    );
  });

  it('rejects alg=none before verify', async () => {
    const h = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString(
      'base64url',
    );
    const p = Buffer.from(JSON.stringify({ sub: '1', exp: 9e9 })).toString(
      'base64url',
    );
    const bad = `${h}.${p}.`;
    await assert.rejects(
      () => verifyIdToken('vk', bad, cfg()),
      (e: unknown) => e instanceof OidcError && e.code === 'invalid_token',
    );
  });

  it('rejects expired', async () => {
    const idToken = signRs256(
      { alg: 'RS256', typ: 'JWT' },
      { iis: 'VK', sub: 1, app: Number(VK_APP), exp: 1_700_000_000 - 10 },
    );
    await assert.rejects(
      () => verifyIdToken('vk', idToken, cfg()),
      (e: unknown) => e instanceof OidcError && e.code === 'expired',
    );
  });
});

describe('POST /api/v1/auth/oidc', () => {
  it('exchanges Mail.ru ID token for app JWT', async () => {
    const idToken = signRs256(
      { alg: 'RS256', typ: 'JWT', kid },
      {
        iss: 'https://account.mail.ru',
        sub: 'u1',
        aud: MAILRU_AUD,
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
    const body = (await res.json()) as {
      auth_subject: string;
      provider: string;
      token: string;
      user_id: string;
    };
    assert.equal(body.auth_subject, 'oidc-user@mail.ru');
    assert.equal(body.provider, 'mailru');
    assert.equal(verifyJwt(TEST_JWT_SECRET, body.token), body.user_id);
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
    const body = (await res.json()) as {
      auth_subject: string;
      provider: string;
    };
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

describe('exchangeMailruAuthorizationCode', () => {
  it('rejects non-allowlisted redirect_uri', async () => {
    await assert.rejects(
      () =>
        exchangeMailruAuthorizationCode(
          {
            code: 'code12345',
            redirectUri: 'https://evil.example/cb',
          },
          {
            mailruClientId: 'cid',
            mailruClientSecret: 'sec',
          },
        ),
      (e: unknown) => e instanceof OidcError,
    );
  });

  it('isAllowedOidcRedirectUri only fitpulse scheme', () => {
    assert.equal(isAllowedOidcRedirectUri('fitpulse://oauth'), true);
    assert.equal(isAllowedOidcRedirectUri('https://app.example/oauth'), false);
  });

  it('posts code + verifier and returns id_token', async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    const fakeFetch: typeof fetch = async (url, init) => {
      calls.push({ url: String(url), init });
      return new Response(
        JSON.stringify({
          id_token: 'aaa.bbb.ccc',
          access_token: 'at',
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    };
    const out = await exchangeMailruAuthorizationCode(
      {
        code: 'code12345',
        redirectUri: 'fitpulse://oauth',
        codeVerifier: 'v' + 'a'.repeat(42),
      },
      {
        mailruClientId: 'cid',
        mailruClientSecret: 'sec',
        fetchImpl: fakeFetch,
      },
    );
    assert.equal(out.id_token, 'aaa.bbb.ccc');
    assert.equal(calls.length, 1);
    assert.match(calls[0]!.url, /oauth\.mail\.ru\/token/);
    const body = String(calls[0]!.init?.body ?? '');
    assert.match(body, /grant_type=authorization_code/);
    assert.match(body, /code_verifier=/);
    const auth = String(
      (calls[0]!.init?.headers as Record<string, string>)?.Authorization ?? '',
    );
    assert.match(auth, /^Basic /);
  });

  it('requires client secret', async () => {
    await assert.rejects(
      () =>
        exchangeMailruAuthorizationCode(
          { code: 'code12345', redirectUri: 'fitpulse://oauth' },
          { mailruClientId: 'cid' },
        ),
      (e: unknown) =>
        e instanceof OidcError && e.code === 'provider_not_configured',
    );
  });
});
