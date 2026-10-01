/**
 * Client-side OIDC helpers for FitPulse (VK ID + Mail.ru).
 *
 * - Public client_ids only (EXPO_PUBLIC_*) — never server secrets.
 * - state (CSRF) required for every auth attempt.
 * - PKCE (S256) for VK authorization-code flow.
 * - Mail.ru: implicit token response + state (code exchange needs client_secret → server).
 */
import type { OidcProvider } from './syncAuth';

export const OAUTH_REDIRECT_URI = 'fitpulse://oauth';

const PENDING_KEY = 'fitpulse.oidc.pending';

export type OidcClientConfig = {
  vkClientId: string | null;
  mailruClientId: string | null;
  syncApiUrl: string | null;
};

export type PendingOidc = {
  provider: OidcProvider;
  state: string;
  /** PKCE verifier; only set for code-flow (VK). */
  codeVerifier?: string;
  createdAt: number;
};

export type OAuthCallback =
  | { kind: 'id_token'; token: string; state: string | null }
  | { kind: 'access_token'; token: string; state: string | null }
  | { kind: 'code'; code: string; state: string | null; deviceId?: string | null }
  | { kind: 'error'; error: string; state: string | null };

function readEnv(key: string): string {
  const v =
    (typeof process !== 'undefined' &&
      (process.env as Record<string, string | undefined>)?.[key]) ||
    '';
  return typeof v === 'string' ? v.trim() : '';
}

/** Public client config only. Empty string → null (provider disabled). */
export function getOidcClientConfig(): OidcClientConfig {
  const vk = readEnv('EXPO_PUBLIC_OIDC_VK_CLIENT_ID');
  const mailru = readEnv('EXPO_PUBLIC_OIDC_MAILRU_CLIENT_ID');
  const sync = readEnv('EXPO_PUBLIC_SYNC_API_URL').replace(/\/$/, '');
  return {
    vkClientId: vk || null,
    mailruClientId: mailru || null,
    syncApiUrl: sync || null,
  };
}

export function isOidcProviderConfigured(
  provider: OidcProvider,
  cfg: OidcClientConfig = getOidcClientConfig(),
): boolean {
  return provider === 'vk' ? !!cfg.vkClientId : !!cfg.mailruClientId;
}

export function configuredOidcProviders(
  cfg: OidcClientConfig = getOidcClientConfig(),
): OidcProvider[] {
  const out: OidcProvider[] = [];
  if (cfg.vkClientId) out.push('vk');
  if (cfg.mailruClientId) out.push('mailru');
  return out;
}

/** URL-safe random string (a-zA-Z0-9_-), length chars. */
export function randomUrlSafe(length: number): string {
  const alphabet =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  const bytes = new Uint8Array(length);
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  let s = '';
  for (let i = 0; i < length; i++) s += alphabet[bytes[i]! % alphabet.length];
  return s;
}

export function generateState(): string {
  return randomUrlSafe(32);
}

/** PKCE code_verifier: 43–128 chars. */
export function generateCodeVerifier(): string {
  return randomUrlSafe(64);
}

/** SHA-256 → base64url for PKCE S256. Prefer SubtleCrypto; pure JS fallback. */
export async function sha256Base64Url(input: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (subtle) {
    const data = new TextEncoder().encode(input);
    const digest = await subtle.digest('SHA-256', data);
    return bufferToBase64Url(digest);
  }
  const hash = sha256Bytes(utf8Encode(input));
  return bytesToBase64Url(hash);
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  return sha256Base64Url(verifier);
}

function bufferToBase64Url(buf: ArrayBuffer): string {
  return bytesToBase64Url(new Uint8Array(buf));
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  const b64 =
    typeof globalThis.btoa === 'function'
      ? globalThis.btoa(bin)
      : Buffer.from(bytes).toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function utf8Encode(s: string): number[] {
  if (typeof TextEncoder !== 'undefined') {
    return Array.from(new TextEncoder().encode(s));
  }
  const out: number[] = [];
  for (let i = 0; i < s.length; i++) {
    let c = s.charCodeAt(i);
    if (c < 0x80) out.push(c);
    else if (c < 0x800) {
      out.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    } else {
      out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    }
  }
  return out;
}

/** Compact SHA-256 for PKCE fallback when SubtleCrypto is unavailable. */
function sha256Bytes(msg: number[]): Uint8Array {
  const K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
    0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
    0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
    0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
    0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
    0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]);
  const H = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c,
    0x1f83d9ab, 0x5be0cd19,
  ]);
  const bitLen = msg.length * 8;
  const withPad = msg.slice();
  withPad.push(0x80);
  while ((withPad.length % 64) !== 56) withPad.push(0);
  for (let i = 7; i >= 0; i--) withPad.push((bitLen / 2 ** (i * 8)) & 0xff);

  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));
  for (let i = 0; i < withPad.length; i += 64) {
    const w = new Uint32Array(64);
    for (let t = 0; t < 16; t++) {
      const j = i + t * 4;
      w[t] =
        ((withPad[j]! << 24) |
          (withPad[j + 1]! << 16) |
          (withPad[j + 2]! << 8) |
          withPad[j + 3]!) >>>
        0;
    }
    for (let t = 16; t < 64; t++) {
      const s0 =
        rotr(w[t - 15]!, 7) ^ rotr(w[t - 15]!, 18) ^ (w[t - 15]! >>> 3);
      const s1 =
        rotr(w[t - 2]!, 17) ^ rotr(w[t - 2]!, 19) ^ (w[t - 2]! >>> 10);
      w[t] = (w[t - 16]! + s0 + w[t - 7]! + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = [
      H[0]!, H[1]!, H[2]!, H[3]!, H[4]!, H[5]!, H[6]!, H[7]!,
    ];
    for (let t = 0; t < 64; t++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K[t]! + w[t]!) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      h = g; g = f; f = e; e = (d + t1) >>> 0;
      d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    H[0] = (H[0]! + a) >>> 0;
    H[1] = (H[1]! + b) >>> 0;
    H[2] = (H[2]! + c) >>> 0;
    H[3] = (H[3]! + d) >>> 0;
    H[4] = (H[4]! + e) >>> 0;
    H[5] = (H[5]! + f) >>> 0;
    H[6] = (H[6]! + g) >>> 0;
    H[7] = (H[7]! + h) >>> 0;
  }
  const out = new Uint8Array(32);
  for (let i = 0; i < 8; i++) {
    out[i * 4] = (H[i]! >>> 24) & 0xff;
    out[i * 4 + 1] = (H[i]! >>> 16) & 0xff;
    out[i * 4 + 2] = (H[i]! >>> 8) & 0xff;
    out[i * 4 + 3] = H[i]! & 0xff;
  }
  return out;
}

export async function buildVkAuthorizeUrl(
  clientId: string,
  state: string,
  codeChallenge: string,
): Promise<string> {
  const q = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: OAUTH_REDIRECT_URI,
    scope: 'email',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });
  return `https://id.vk.ru/authorize?${q.toString()}`;
}

/** Mail.ru: implicit token + state (public client; code needs secret on server). */
export function buildMailruAuthorizeUrl(clientId: string, state: string): string {
  const q = new URLSearchParams({
    client_id: clientId,
    response_type: 'token',
    redirect_uri: OAUTH_REDIRECT_URI,
    scope: 'userinfo',
    state,
  });
  return `https://o2.mail.ru/login?${q.toString()}`;
}

export function parseOAuthCallback(url: string): OAuthCallback | null {
  if (!url.startsWith(OAUTH_REDIRECT_URI)) return null;
  try {
    const hash = url.includes('#') ? url.split('#')[1]! : '';
    const query = url.includes('?') ? url.split('?')[1]!.split('#')[0]! : '';
    const params = new URLSearchParams(hash || query);
    const state = params.get('state');
    const err = params.get('error');
    if (err) {
      return { kind: 'error', error: err, state };
    }
    const code = params.get('code');
    if (code && code.length >= 8) {
      return {
        kind: 'code',
        code,
        state,
        deviceId: params.get('device_id'),
      };
    }
    const idToken = params.get('id_token');
    if (idToken && idToken.split('.').length === 3 && idToken.length >= 40) {
      return { kind: 'id_token', token: idToken, state };
    }
    const access = params.get('access_token');
    if (access && access.length >= 20) {
      return { kind: 'access_token', token: access, state };
    }
    return null;
  } catch {
    return null;
  }
}

export type KeyValueStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem?(key: string): Promise<void>;
};

export async function savePendingOidc(
  storage: KeyValueStorage,
  pending: PendingOidc,
): Promise<void> {
  await storage.setItem(PENDING_KEY, JSON.stringify(pending));
}

export async function loadPendingOidc(
  storage: KeyValueStorage,
): Promise<PendingOidc | null> {
  try {
    const raw = await storage.getItem(PENDING_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as PendingOidc;
    if (
      !p ||
      (p.provider !== 'vk' && p.provider !== 'mailru') ||
      typeof p.state !== 'string' ||
      typeof p.createdAt !== 'number'
    ) {
      return null;
    }
    if (Date.now() - p.createdAt > 15 * 60 * 1000) {
      await clearPendingOidc(storage);
      return null;
    }
    return p;
  } catch {
    return null;
  }
}

export async function clearPendingOidc(storage: KeyValueStorage): Promise<void> {
  try {
    if (typeof storage.removeItem === 'function') {
      await storage.removeItem(PENDING_KEY);
    } else {
      await storage.setItem(PENDING_KEY, '');
    }
  } catch {
    // ignore
  }
}

/** Exchange VK auth code for tokens (public client + PKCE). */
export async function exchangeVkCode(opts: {
  clientId: string;
  code: string;
  codeVerifier: string;
  deviceId?: string | null;
  fetchImpl?: typeof fetch;
}): Promise<{ id_token?: string; access_token?: string }> {
  const fetchFn = opts.fetchImpl ?? globalThis.fetch.bind(globalThis);
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: opts.clientId,
    code: opts.code,
    code_verifier: opts.codeVerifier,
    redirect_uri: OAUTH_REDIRECT_URI,
    device_id: opts.deviceId || 'fitpulse',
  });
  const res = await fetchFn('https://id.vk.ru/oauth2/auth', {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      accept: 'application/json',
    },
    body: body.toString(),
  });
  if (!res.ok) {
    throw new Error(`vk_token_exchange_${res.status}`);
  }
  const json = (await res.json()) as {
    id_token?: string;
    access_token?: string;
  };
  return json;
}

/** Simple async mutex — serializes auth mutations in the component. */
export function createMutex() {
  let chain: Promise<void> = Promise.resolve();
  return function runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    const next = chain.then(fn, fn);
    chain = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  };
}
