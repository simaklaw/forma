/**
 * FitPulse P2 client auth — anonymous per-device identity → per-user JWT.
 *
 * Flow: first sync attempt generates a random device subject, stores it
 * in AsyncStorage, and exchanges it via POST /api/v1/auth/register for a
 * deterministic user_id (server-side UUIDv5) + HS256 JWT (30-day TTL).
 * The JWT is sent as Authorization: Bearer on every sync request.
 * Expired credentials are re-registered with the SAME stored subject, so
 * the user_id is stable across the app lifetime.
 */

import { createLogger } from '@/core/logger';

const log = createLogger('sync-auth');

export type SyncCredentials = {
  user_id: string;
  token: string;
  expires_at: string;
};

/** AsyncStorage-shaped subset (kept minimal for testability). */
export type KeyValueStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem?(key: string): Promise<void>;
};

export const AUTH_SUBJECT_KEY = 'fitpulse.sync.auth_subject';
export const CREDENTIALS_KEY = 'fitpulse.sync.credentials';

export class SyncAuthError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'SyncAuthError';
    this.status = status;
  }
}

export function randomAuthSubject(): string {
  const part = () => Math.random().toString(36).slice(2, 12);
  return 'device-' + part() + '-' + part() + '-' + part();
}

export function isValidCredentials(value: unknown): value is SyncCredentials {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.user_id === 'string' &&
    v.user_id.length > 0 &&
    typeof v.token === 'string' &&
    v.token.length > 0 &&
    typeof v.expires_at === 'string' &&
    !Number.isNaN(Date.parse(v.expires_at))
  );
}

export function isExpired(creds: SyncCredentials, marginMs = 60_000): boolean {
  return Date.parse(creds.expires_at) - marginMs <= Date.now();
}

export type RegisterOptions = {
  baseUrl: string;
  authSubject: string;
  fetchImpl?: typeof fetch;
};

export async function registerSyncCredentials(
  opts: RegisterOptions,
): Promise<SyncCredentials> {
  const base = opts.baseUrl.replace(/\/$/, '');
  const fetchFn = opts.fetchImpl ?? globalThis.fetch.bind(globalThis);
  const res = await fetchFn(base + '/api/v1/auth/register', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({ auth_subject: opts.authSubject }),
  });
  if (!res.ok) {
    if (res.status === 409) {
      throw new SyncAuthError('email_already_linked', 409);
    }
    throw new SyncAuthError('register_failed_' + res.status, res.status);
  }
  const json: unknown = await res.json();
  if (!isValidCredentials(json)) {
    throw new SyncAuthError('register_invalid_response');
  }
  return json;
}

export async function loadSyncCredentials(
  storage: KeyValueStorage,
): Promise<SyncCredentials | null> {
  try {
    const raw = await storage.getItem(CREDENTIALS_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isValidCredentials(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function saveSyncCredentials(
  storage: KeyValueStorage,
  creds: SyncCredentials,
): Promise<void> {
  await storage.setItem(CREDENTIALS_KEY, JSON.stringify(creds));
}

export type EnsureOptions = {
  baseUrl: string;
  storage: KeyValueStorage;
  fetchImpl?: typeof fetch;
};

export async function ensureSyncCredentials(
  opts: EnsureOptions,
): Promise<SyncCredentials | null> {
  const existing = await loadSyncCredentials(opts.storage);
  if (existing && !isExpired(existing)) {
    return existing;
  }

  let subject: string | null = null;
  try {
    subject = await opts.storage.getItem(AUTH_SUBJECT_KEY);
  } catch {
    subject = null;
  }
  if (!subject) {
    subject = randomAuthSubject();
    try {
      await opts.storage.setItem(AUTH_SUBJECT_KEY, subject);
    } catch {
      // ignore
    }
  }

  try {
    const creds = await registerSyncCredentials({
      baseUrl: opts.baseUrl,
      authSubject: subject,
      fetchImpl: opts.fetchImpl,
    });
    await saveSyncCredentials(opts.storage, creds);
    log.info('sync credentials ready', {
      user_id: creds.user_id,
      revalidated: existing != null,
    });
    return creds;
  } catch (err) {
    log.warn('sync register failed; staying offline', {
      err: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

export function normalizeAuthSubject(raw: string): string | null {
  const s = raw.trim().toLowerCase();
  return s.length > 0 ? s : null;
}

export function isEmailSubject(subject: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(subject);
}

export async function loadAuthSubject(
  storage: KeyValueStorage,
): Promise<string | null> {
  try {
    return await storage.getItem(AUTH_SUBJECT_KEY);
  } catch {
    return null;
  }
}

export type LinkAccountOptions = {
  baseUrl: string;
  storage: KeyValueStorage;
  subject: string;
  fetchImpl?: typeof fetch;
};

export async function linkSyncAccount(
  opts: LinkAccountOptions,
): Promise<SyncCredentials> {
  const subject = normalizeAuthSubject(opts.subject);
  if (!subject) {
    throw new SyncAuthError('subject_empty');
  }
  await opts.storage.setItem(AUTH_SUBJECT_KEY, subject);
  const creds = await registerSyncCredentials({
    baseUrl: opts.baseUrl,
    authSubject: subject,
    fetchImpl: opts.fetchImpl,
  });
  await saveSyncCredentials(opts.storage, creds);
  log.info('sync account linked', {
    user_id: creds.user_id,
    subject_kind: isEmailSubject(subject) ? 'email' : 'custom',
  });
  return creds;
}

export type OidcProvider = 'mailru' | 'vk';

export type ExchangeOidcOptions = {
  baseUrl: string;
  storage: KeyValueStorage;
  provider: OidcProvider;
  idToken?: string;
  code?: string;
  codeVerifier?: string;
  redirectUri?: string;
  fetchImpl?: typeof fetch;
};

/**
 * Exchange Mail.ru / VK credentials for app JWT via POST /api/v1/auth/oidc.
 * - id_token (VK after client exchange)
 * - Mail.ru code + PKCE verifier (server holds client_secret)
 */
export async function exchangeOidcCredentials(
  opts: ExchangeOidcOptions,
): Promise<SyncCredentials> {
  const base = opts.baseUrl.replace(/\/$/, '');
  const fetchFn = opts.fetchImpl ?? globalThis.fetch.bind(globalThis);
  const payload: Record<string, string> = { provider: opts.provider };
  if (opts.code) {
    payload.code = opts.code;
    if (opts.codeVerifier) payload.code_verifier = opts.codeVerifier;
    if (opts.redirectUri) payload.redirect_uri = opts.redirectUri;
  } else if (opts.idToken) {
    payload.id_token = opts.idToken;
  } else {
    throw new SyncAuthError('oidc_missing_credentials', 400);
  }
  const res = await fetchFn(`${base}/api/v1/auth/oidc`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(payload),
  });
  if (res.status === 401 || res.status === 400) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new SyncAuthError(body.error ?? 'oidc_rejected', res.status);
  }
  if (res.status === 429) {
    throw new SyncAuthError('rate_limited', 429);
  }
  if (res.status === 503) {
    throw new SyncAuthError('oidc_not_configured', 503);
  }
  if (!res.ok) {
    throw new SyncAuthError(`oidc_http_${res.status}`, res.status);
  }
  const body = (await res.json()) as {
    user_id?: string;
    token?: string;
    expires_at?: string;
    auth_subject?: string;
  };
  if (
    typeof body.user_id !== 'string' ||
    typeof body.token !== 'string' ||
    typeof body.expires_at !== 'string'
  ) {
    throw new SyncAuthError('oidc_bad_response', res.status);
  }
  const creds: SyncCredentials = {
    user_id: body.user_id,
    token: body.token,
    expires_at: body.expires_at,
  };
  await saveSyncCredentials(opts.storage, creds);
  if (typeof body.auth_subject === 'string' && body.auth_subject.length > 0) {
    await opts.storage.setItem(AUTH_SUBJECT_KEY, body.auth_subject);
  }
  return creds;
}

export async function clearSyncAccount(
  storage: KeyValueStorage,
): Promise<void> {
  const keys = [AUTH_SUBJECT_KEY, CREDENTIALS_KEY];
  keys.push(
    '@fitpulse/health_connect_export_enabled',
    '@fitpulse/health_connect_last_export_at',
  );
  for (const key of keys) {
    try {
      if (typeof storage.removeItem === 'function') {
        await storage.removeItem(key);
      } else {
        await storage.setItem(key, '');
      }
    } catch (err) {
      log.debug('clearSyncAccount key failed', {
        key,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }
  log.info('sync account cleared');
}
