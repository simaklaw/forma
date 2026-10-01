/**
 * Client-side OIDC helpers for FitPulse (VK ID + Mail.ru).
 *
 * - Public client_ids only (EXPO_PUBLIC_*) — never server secrets.
 * - state (CSRF) required for every auth attempt.
 * - PKCE (S256) for VK and Mail.ru authorization-code flows.
 * - Mail.ru: code exchange with client_secret on API only.
 */
import type { OidcProvider } from './syncAuth';

export const OAUTH_REDIRECT_URI = 'fitpulse://oauth';

const PENDING_KEY = 'fitpulse.oidc.pending';
const PENDING_TTL_MS = 10 * 60 * 1000;

export type OidcClientConfig = {
  vkClientId: string | null;
  mailruClientId: string | null;
  syncApiUrl: string | null;
};

export type PendingOidc = {
  provider: OidcProvider;
  state: string;
  /** PKCE verifier; set for code-flow (VK + Mail.ru). */
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

export function randomUrlSafe(len: number): string {
  const alphabet =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  const bytes = new Uint8Array(len);
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < len; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  let s = '';
  for (let i = 0; i < len; i++) s += alphabet[bytes[i]! % alphabet.length]!;
  return s;
}

export function generateState(): string {
  return randomUrlSafe(32);
}

export function generateCodeVerifier(): string {
  return randomUrlSafe(64);
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

async function sha256Base64Url(input: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (subtle) {
    const data = new TextEncoder().encode(input);
    const hash = await subtle.digest('SHA-256', data);
    return bytesToBase64Url(new Uint8Array(hash));
  }
  const { createHash } = await import('node:crypto');
  const hash = createHash('sha256').update(input).digest();
  return bytesToBase64Url(new Uint8Array(hash));
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  return sha256Base64Url(verifier);
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

/** Mail.ru OIDC authorization_code + PKCE; secret exchange on API. */
export function buildMailruAuthorizeUrl(
  clientId: string,
  state: string,
  codeChallenge: string,
): string {
  const q = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: OAUTH_REDIRECT_URI,
    scope: 'userinfo',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });
  return `https://oauth.mail.ru/login?${q.toString()}`;
}

export function parseOAuthCallback(url: string): OAuthCallback | null {
  try {
    const parsed = new URL(url);
    if (
      parsed.protocol !== 'fitpulse:' ||
      parsed.hostname !== 'oauth' ||
      parsed.port !== '' ||
      parsed.username !== '' ||
      parsed.password !== ''
    ) return null;

    const params = parsed.hash
      ? new URLSearchParams(parsed.hash.slice(1))
      : parsed.searchParams;
    const state = params.get('state');
    const err = params.get('error');
    if (err) return { kind: 'error', error: err, state };
    const code = params.get('code');
    if (code && code.length >= 8) return { kind: 'code', code, state, deviceId: params.get('device_id') };
    const idToken = params.get('id_token');
    if (idToken && idToken.split('.').length === 3 && idToken.length >= 40) return { kind: 'id_token', token: idToken, state };
    const access = params.get('access_token');
    if (access && access.length >= 20) return { kind: 'access_token', token: access, state };
    return null;
  } catch {
    return null;
  }
}
export type KeyValueStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem?: (key: string) => Promise<void>;
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
    if (Date.now() - p.createdAt > PENDING_TTL_MS) {
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

export async function exchangeVkCode(opts: {
  clientId: string;
  code: string;
  codeVerifier: string;
  deviceId?: string | null;
}): Promise<{ id_token?: string; access_token?: string }> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: opts.clientId,
    code: opts.code,
    redirect_uri: OAUTH_REDIRECT_URI,
    code_verifier: opts.codeVerifier,
  });
  if (opts.deviceId) body.set('device_id', opts.deviceId);
  const res = await fetch('https://id.vk.ru/oauth2/auth', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) {
    throw new Error(`vk_token_exchange_${res.status}`);
  }
  return (await res.json()) as { id_token?: string; access_token?: string };
}

export function createMutex() {
  let chain: Promise<void> = Promise.resolve();
  return function runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    const run = chain.then(() => fn());
    chain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  };
}
