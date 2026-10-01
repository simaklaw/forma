/**
 * Sync account credentials (JWT) for FitPulse offline-first client.
 * Local device subject or linked email / OIDC subject → server register/oidc → JWT.
 */

export type SyncCredentials = {
  user_id: string;
  token: string;
  expires_at: string;
};

export type KeyValueStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem?: (key: string) => Promise<void>;
};

export const AUTH_SUBJECT_KEY = 'fitpulse.sync.auth_subject';
export const CREDENTIALS_KEY = 'fitpulse.sync.credentials';

export class SyncAuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'SyncAuthError';
    this.status = status;
  }
}

export function randomAuthSubject(): string {
  return `device-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function isValidCredentials(value: unknown): value is SyncCredentials {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.user_id === 'string' &&
    typeof v.token === 'string' &&
    typeof v.expires_at === 'string'
  );
}

export function isExpired(creds: SyncCredentials, marginMs = 60_000): boolean {
  const t = Date.parse(creds.expires_at);
  if (!Number.isFinite(t)) return true;
  return t <= Date.now() + marginMs;
}

export type RegisterOptions = {
  baseUrl: string;
  storage: KeyValueStorage;
  authSubject: string;
  fetchImpl?: typeof fetch;
};

export async function registerSyncCredentials(
  opts: RegisterOptions,
): Promise<SyncCredentials> {
  const base = opts.baseUrl.replace(/\/$/, '');
  const fetchFn = opts.fetchImpl ?? globalThis.fetch.bind(globalThis);
  const res = await fetchFn(`${base}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ auth_subject: opts.authSubject }),
  });
  if (!res.ok) {
    throw new SyncAuthError(`register_http_${res.status}`, res.status);
  }
  const body = (await res.json()) as Partial<SyncCredentials>;
  if (!isValidCredentials(body)) {
    throw new SyncAuthError('register_bad_response', res.status);
  }
  await saveSyncCredentials(opts.storage, body);
  await opts.storage.setItem(AUTH_SUBJECT_KEY, opts.authSubject);
  return body;
}

export async function loadSyncCredentials(
  storage: KeyValueStorage,
): Promise<SyncCredentials | null> {
  const raw = await storage.getItem(CREDENTIALS_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
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
  try {
    const existing = await loadSyncCredentials(opts.storage);
    if (existing && !isExpired(existing)) return existing;
    let subject = await loadAuthSubject(opts.storage);
    if (!subject) {
      subject = randomAuthSubject();
      await opts.storage.setItem(AUTH_SUBJECT_KEY, subject);
    }
    return await registerSyncCredentials({
      baseUrl: opts.baseUrl,
      storage: opts.storage,
      authSubject: subject,
      fetchImpl: opts.fetchImpl,
    });
  } catch {
    return null;
  }
}

export function normalizeAuthSubject(raw: string): string | null {
  const s = raw.trim().toLowerCase();
  if (s.length < 3 || s.length > 200) return null;
  return s;
}

export function isEmailSubject(subject: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(subject.trim().toLowerCase());
}

export async function loadAuthSubject(
  storage: KeyValueStorage,
): Promise<string | null> {
  const raw = await storage.getItem(AUTH_SUBJECT_KEY);
  if (!raw) return null;
  return normalizeAuthSubject(raw);
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
    throw new SyncAuthError('invalid_auth_subject', 400);
  }
  return registerSyncCredentials({
    baseUrl: opts.baseUrl,
    storage: opts.storage,
    authSubject: subject,
    fetchImpl: opts.fetchImpl,
  });
}

export type OidcProvider = 'mailru' | 'vk';

export type ExchangeOidcOptions = {
  baseUrl: string;
  storage: KeyValueStorage;
  provider: OidcProvider;
  idToken: string;
  fetchImpl?: typeof fetch;
};

/**
 * Exchange a Mail.ru / VK ID token for app JWT via POST /api/v1/auth/oidc.
 * Same persistence as linkSyncAccount (credentials + auth_subject).
 */
export async function exchangeOidcCredentials(
  opts: ExchangeOidcOptions,
): Promise<SyncCredentials> {
  const base = opts.baseUrl.replace(/\/$/, '');
  const fetchFn = opts.fetchImpl ?? globalThis.fetch.bind(globalThis);
  const res = await fetchFn(`${base}/api/v1/auth/oidc`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      provider: opts.provider,
      id_token: opts.idToken,
    }),
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

/**
 * Clear linked account + credentials.
 * Also clears Health Connect last-export prefs so timestamps do not
 * leak across accounts on the same device.
 */
export async function clearSyncAccount(
  storage: KeyValueStorage,
): Promise<void> {
  const keys = [
    AUTH_SUBJECT_KEY,
    CREDENTIALS_KEY,
    '@fitpulse/health_connect_export_enabled',
    '@fitpulse/health_connect_last_export_at',
  ];
  for (const k of keys) {
    if (storage.removeItem) await storage.removeItem(k);
    else await storage.setItem(k, '');
  }
}
