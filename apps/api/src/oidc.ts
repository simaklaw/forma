/**
 * OIDC ID-token verification (Google + Apple) → app auth_subject.
 *
 * No extra deps: fetch provider JWKS, verify RS256 with node:crypto.
 * Env:
 *   OIDC_GOOGLE_CLIENT_ID — expected aud for Google ID tokens
 *   OIDC_APPLE_CLIENT_ID  — expected aud for Apple ID tokens (Services ID)
 */

import { createPublicKey, createVerify, createHash } from 'node:crypto';

export type OidcProvider = 'google' | 'apple';

export type OidcClaims = {
  sub: string;
  email?: string;
  email_verified?: boolean;
  iss: string;
  aud: string | string[];
  exp: number;
  iat?: number;
};

export type OidcConfig = {
  googleClientId?: string;
  appleClientId?: string;
  /** Injectable clock for tests. */
  nowSeconds?: () => number;
  /** Injectable JWKS fetch for tests. */
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

const GOOGLE_ISS = new Set([
  'https://accounts.google.com',
  'accounts.google.com',
]);
const APPLE_ISS = 'https://appleid.apple.com';

const JWKS_URL: Record<OidcProvider, string> = {
  google: 'https://www.googleapis.com/oauth2/v3/certs',
  apple: 'https://appleid.apple.com/auth/keys',
};

/** In-memory JWKS cache (per process). */
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
  const verified =
    claims.email_verified === true ||
    // Apple may omit email_verified when email is present on first auth
    (provider === 'apple' && email.length > 0);
  if (email && verified && email.includes('@') && email.length <= 200) {
    return email;
  }
  return `oidc:${provider}:${claims.sub}`.slice(0, 200);
}

async function defaultFetchJwks(provider: OidcProvider): Promise<Jwk[]> {
  const cached = jwksCache.get(provider);
  if (cached && Date.now() - cached.at < JWKS_TTL_MS) {
    return cached.keys;
  }
  const res = await fetch(JWKS_URL[provider]);
  if (!res.ok) {
    throw new OidcError('jwks_fetch_failed', 'jwks_unavailable');
  }
  const body = (await res.json()) as { keys?: Jwk[] };
  const keys = Array.isArray(body.keys) ? body.keys : [];
  jwksCache.set(provider, { at: Date.now(), keys });
  return keys;
}

/** Build a PEM-capable KeyObject from a JWK RSA public key. */
function jwkToKeyObject(jwk: Jwk) {
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

/**
 * Verify an OIDC ID token and return claims.
 * Throws OidcError on any failure.
 */
export async function verifyIdToken(
  provider: OidcProvider,
  idToken: string,
  cfg: OidcConfig,
): Promise<OidcClaims> {
  if (provider !== 'google' && provider !== 'apple') {
    throw new OidcError('unknown_provider', 'invalid_provider');
  }
  const expectedAud =
    provider === 'google' ? cfg.googleClientId : cfg.appleClientId;
  if (!expectedAud) {
    throw new OidcError(
      `${provider}_not_configured`,
      'provider_not_configured',
    );
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

  const fetchJwks = cfg.fetchJwks ?? defaultFetchJwks;
  let keys: Jwk[];
  try {
    keys = await fetchJwks(provider);
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

  const data = `${parts[0]}.${parts[1]}`;
  const signature = b64urlToBuf(parts[2]);
  const key = jwkToKeyObject(jwk);
  const verifier = createVerify('RSA-SHA256');
  verifier.update(data);
  verifier.end();
  if (!verifier.verify(key, signature)) {
    throw new OidcError('bad_signature', 'invalid_token');
  }

  const now = (cfg.nowSeconds ?? (() => Math.floor(Date.now() / 1000)))();
  if (typeof payload.exp !== 'number' || payload.exp < now) {
    throw new OidcError('token_expired', 'expired');
  }

  if (provider === 'google') {
    if (!GOOGLE_ISS.has(String(payload.iss))) {
      throw new OidcError('bad_issuer', 'issuer_mismatch');
    }
  } else if (payload.iss !== APPLE_ISS) {
    throw new OidcError('bad_issuer', 'issuer_mismatch');
  }

  if (!audMatches(payload.aud, expectedAud)) {
    throw new OidcError('bad_audience', 'audience_mismatch');
  }

  if (typeof payload.sub !== 'string' || payload.sub.length < 3) {
    throw new OidcError('missing_sub', 'invalid_token');
  }

  return payload;
}

/** Test helper: clear JWKS cache between tests. */
export function clearOidcJwksCache(): void {
  jwksCache.clear();
}

/** Deterministic fingerprint of a raw id_token (logging only — not auth). */
export function idTokenFingerprint(idToken: string): string {
  return createHash('sha256').update(idToken).digest('hex').slice(0, 12);
}
