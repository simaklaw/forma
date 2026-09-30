/**
 * OIDC / ID-token verification for RU providers: Mail.ru + VK ID.
 *
 * No Google / Apple (not used in this product).
 *
 * Mail.ru — standard OIDC:
 *   issuer https://account.mail.ru
 *   jwks   https://account.mail.ru/.well-known/jwks.json
 *   env    OIDC_MAILRU_CLIENT_ID
 *
 * VK ID — JWT id_token signed with VK public key (docs):
 *   claims: iis|iss="VK", sub, app (=client_id), exp, iat
 *   env    OIDC_VK_CLIENT_ID
 *          OIDC_VK_PUBLIC_KEY (PEM from VK ID docs)
 *
 * No extra deps: node:crypto only.
 */

import {
  createPublicKey,
  createVerify,
  createHash,
  type KeyObject,
} from 'node:crypto';

export type OidcProvider = 'mailru' | 'vk';

export type OidcClaims = {
  sub: string;
  email?: string;
  email_verified?: boolean;
  /** Standard issuer, or VK's non-standard `iis`. */
  iss?: string;
  iis?: string;
  aud?: string | string[];
  /** VK ID application id (client_id). */
  app?: number | string;
  exp: number;
  iat?: number;
};

export type OidcConfig = {
  mailruClientId?: string;
  vkClientId?: string;
  /** PEM public key for VK ID tokens. */
  vkPublicKeyPem?: string;
  nowSeconds?: () => number;
  fetchJwks?: (provider: OidcProvider) => Promise<Jwk[]>;
};

export type Jwk = {
  kty: string;
  kid?: string;
  alg?: string;
  use?: string;
  n?: string;
  e?: string;
};

const MAILRU_ISS = 'https://account.mail.ru';
const MAILRU_JWKS = 'https://account.mail.ru/.well-known/jwks.json';

/** VK ID: no JWKS URL — PEM via OIDC_VK_PUBLIC_KEY / cfg.vkPublicKeyPem. */
const jwksCache = new Map<OidcProvider, { at: number; keys: Jwk[] }>();
const JWKS_TTL_MS = 60 * 60 * 1000;

export class OidcError extends Error {
  constructor(
    message: string,
    readonly code:
      | 'invalid_token'
      | 'invalid_provider'
      | 'provider_not_configured'
      | 'audience_mismatch'
      | 'issuer_mismatch'
      | 'expired'
      | 'jwks_unavailable',
  ) {
    super(message);
    this.name = 'OidcError';
  }
}

function b64urlToBuf(s: string): Buffer {
  return Buffer.from(s, 'base64url');
}

function decodeJwtPart(part: string): unknown {
  return JSON.parse(b64urlToBuf(part).toString('utf8'));
}

/** Map verified claims → stable auth_subject for subjectUserId. */
export function claimsToAuthSubject(
  provider: OidcProvider,
  claims: OidcClaims,
): string {
  const email =
    typeof claims.email === 'string' ? claims.email.trim().toLowerCase() : '';
  if (email && email.includes('@') && email.length <= 200) {
    if (provider === 'mailru' || claims.email_verified !== false) {
      return email;
    }
  }
  return `oidc:${provider}:${claims.sub}`.slice(0, 200);
}

async function defaultFetchJwks(provider: OidcProvider): Promise<Jwk[]> {
  if (provider !== 'mailru') {
    throw new OidcError('jwks_not_used', 'jwks_unavailable');
  }
  const cached = jwksCache.get(provider);
  if (cached && Date.now() - cached.at < JWKS_TTL_MS) {
    return cached.keys;
  }
  const res = await fetch(MAILRU_JWKS);
  if (!res.ok) {
    throw new OidcError('jwks_fetch_failed', 'jwks_unavailable');
  }
  const body = (await res.json()) as { keys?: Jwk[] };
  const keys = Array.isArray(body.keys) ? body.keys : [];
  jwksCache.set(provider, { at: Date.now(), keys });
  return keys;
}

function jwkToKeyObject(jwk: Jwk): KeyObject {
  if (jwk.kty !== 'RSA' || !jwk.n || !jwk.e) {
    throw new OidcError('unsupported_jwk', 'invalid_token');
  }
  return createPublicKey({ key: jwk as unknown as JsonWebKey, format: 'jwk' });
}

function audMatches(
  aud: string | string[] | undefined,
  expected: string,
): boolean {
  if (!aud) return false;
  if (typeof aud === 'string') return aud === expected;
  return aud.includes(expected);
}

function verifyRs256(data: string, signature: Buffer, key: KeyObject): boolean {
  const verifier = createVerify('RSA-SHA256');
  verifier.update(data);
  verifier.end();
  return verifier.verify(key, signature);
}

function vkPublicKey(cfg: OidcConfig): KeyObject {
  const pem = cfg.vkPublicKeyPem?.trim();
  if (!pem) {
    throw new OidcError('vk_public_key_missing', 'provider_not_configured');
  }
  return createPublicKey(pem);
}

export async function verifyIdToken(
  provider: OidcProvider,
  idToken: string,
  cfg: OidcConfig,
): Promise<OidcClaims> {
  if (provider !== 'mailru' && provider !== 'vk') {
    throw new OidcError('unknown_provider', 'invalid_provider');
  }

  const parts = idToken.split('.');
  if (parts.length !== 3) {
    throw new OidcError('malformed_jwt', 'invalid_token');
  }

  let header: { alg?: string; kid?: string; typ?: string };
  let payload: OidcClaims;
  try {
    header = decodeJwtPart(parts[0]) as typeof header;
    payload = decodeJwtPart(parts[1]) as OidcClaims;
  } catch {
    throw new OidcError('malformed_jwt_json', 'invalid_token');
  }

  if (header.alg !== 'RS256') {
    throw new OidcError('unsupported_alg', 'invalid_token');
  }

  const data = `${parts[0]}.${parts[1]}`;
  const signature = b64urlToBuf(parts[2]);

  if (provider === 'mailru') {
    const expectedAud = cfg.mailruClientId;
    if (!expectedAud) {
      throw new OidcError('mailru_not_configured', 'provider_not_configured');
    }
    const fetchJwks = cfg.fetchJwks ?? defaultFetchJwks;
    let keys: Jwk[];
    try {
      keys = await fetchJwks('mailru');
    } catch (e) {
      if (e instanceof OidcError) throw e;
      throw new OidcError('jwks_fetch_failed', 'jwks_unavailable');
    }
    const jwk =
      (header.kid ? keys.find((k) => k.kid === header.kid) : undefined) ??
      keys[0];
    if (!jwk) {
      throw new OidcError('no_matching_jwk', 'invalid_token');
    }
    if (!verifyRs256(data, signature, jwkToKeyObject(jwk))) {
      throw new OidcError('bad_signature', 'invalid_token');
    }
    const iss = String(payload.iss ?? '');
    if (iss !== MAILRU_ISS) {
      throw new OidcError('bad_issuer', 'issuer_mismatch');
    }
    if (!audMatches(payload.aud, expectedAud)) {
      throw new OidcError('bad_audience', 'audience_mismatch');
    }
  } else {
    const expectedApp = cfg.vkClientId;
    if (!expectedApp) {
      throw new OidcError('vk_not_configured', 'provider_not_configured');
    }
    let key: KeyObject;
    try {
      key = vkPublicKey(cfg);
    } catch (e) {
      if (e instanceof OidcError) throw e;
      throw new OidcError('vk_public_key_invalid', 'provider_not_configured');
    }
    if (!verifyRs256(data, signature, key)) {
      throw new OidcError('bad_signature', 'invalid_token');
    }
    const issuer = String(payload.iis ?? payload.iss ?? '');
    if (issuer !== 'VK' && issuer !== 'https://id.vk.ru') {
      throw new OidcError('bad_issuer', 'issuer_mismatch');
    }
    const app = payload.app != null ? String(payload.app) : '';
    if (app !== String(expectedApp)) {
      throw new OidcError('bad_audience', 'audience_mismatch');
    }
  }

  const now = (cfg.nowSeconds ?? (() => Math.floor(Date.now() / 1000)))();
  if (typeof payload.exp !== 'number' || payload.exp < now) {
    throw new OidcError('token_expired', 'expired');
  }

  if (payload.sub == null || String(payload.sub).length < 1) {
    throw new OidcError('missing_sub', 'invalid_token');
  }
  payload.sub = String(payload.sub);

  return payload;
}

export function clearOidcJwksCache(): void {
  jwksCache.clear();
}

export function idTokenFingerprint(idToken: string): string {
  return createHash('sha256').update(idToken).digest('hex').slice(0, 12);
}

export function oidcConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): OidcConfig | undefined {
  const mailruClientId = env.OIDC_MAILRU_CLIENT_ID || undefined;
  const vkClientId = env.OIDC_VK_CLIENT_ID || undefined;
  const vkPublicKeyPem = env.OIDC_VK_PUBLIC_KEY || undefined;
  if (!mailruClientId && !vkClientId) return undefined;
  return { mailruClientId, vkClientId, vkPublicKeyPem };
}
