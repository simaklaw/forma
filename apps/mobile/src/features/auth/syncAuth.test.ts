import {
  ensureSyncCredentials,
  registerSyncCredentials,
  randomAuthSubject,
  isExpired,
  isValidCredentials,
  AUTH_SUBJECT_KEY,
  CREDENTIALS_KEY,
  SyncAuthError,
} from './syncAuth';

function memoryStorage() {
  const m = new Map<string, string>();
  return {
    getItem: async (k: string) => (m.has(k) ? (m.get(k) as string) : null),
    setItem: async (k: string, v: string) => {
      m.set(k, v);
    },
    clear: () => m.clear(),
    _map: m,
  };
}

function jsonResponse(body: unknown, ok = true, status = 200) {
  return async () =>
    ({ ok, status, json: async () => body }) as unknown as typeof fetch;
}

const CREDS = {
  user_id: '11111111-2222-5333-8444-555555555555',
  token: 'aaa.bbb.ccc',
  expires_at: '2099-01-01T00:00:00.000Z',
};

const EXPIRED_CREDS = {
  user_id: '11111111-2222-5333-8444-555555555555',
  token: 'old.token.sig',
  expires_at: '2000-01-01T00:00:00.000Z',
};

describe('syncAuth primitives', () => {
  it('randomAuthSubject is device-shaped and unique', () => {
    const a = randomAuthSubject();
    const b = randomAuthSubject();
    expect(a).toMatch(/^device-[a-z0-9-]+$/);
    expect(a).not.toBe(b);
  });

  it('isValidCredentials accepts a full shape and rejects garbage', () => {
    expect(isValidCredentials(CREDS)).toBe(true);
    expect(isValidCredentials({ user_id: 'x' })).toBe(false);
    expect(isValidCredentials(null)).toBe(false);
    expect(isValidCredentials({ ...CREDS, expires_at: 'not-a-date' })).toBe(false);
  });

  it('isExpired respects the margin', () => {
    expect(isExpired(EXPIRED_CREDS)).toBe(true);
    expect(isExpired(CREDS)).toBe(false);
  });
});

describe('registerSyncCredentials', () => {
  it('posts auth_subject and returns validated credentials', async () => {
    const fetchImpl = jest.fn(jsonResponse(CREDS));
    const creds = await registerSyncCredentials({
      baseUrl: 'http://localhost:8787/',
      authSubject: 'device-abc',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(creds).toEqual(CREDS);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://localhost:8787/api/v1/auth/register');
    expect(JSON.parse(String(init.body)).auth_subject).toBe('device-abc');
  });

  it('throws SyncAuthError on HTTP failure', async () => {
    const fetchImpl = jsonResponse({ error: 'unauthorized' }, false, 500);
    await expect(
      registerSyncCredentials({
        baseUrl: 'http://x',
        authSubject: 'device-abc',
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    ).rejects.toBeInstanceOf(SyncAuthError);
  });

  it('throws on malformed response', async () => {
    const fetchImpl = jsonResponse({ user_id: 'only-user' });
    await expect(
      registerSyncCredentials({
        baseUrl: 'http://x',
        authSubject: 'device-abc',
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    ).rejects.toBeInstanceOf(SyncAuthError);
  });
});

describe('ensureSyncCredentials', () => {
  it('registers on first use and persists subject + credentials', async () => {
    const storage = memoryStorage();
    const fetchImpl = jest.fn(jsonResponse(CREDS));
    const creds = await ensureSyncCredentials({
      baseUrl: 'http://x',
      storage,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(creds).toEqual(CREDS);
    expect(storage._map.has(AUTH_SUBJECT_KEY)).toBe(true);
    expect(JSON.parse(storage._map.get(CREDENTIALS_KEY) as string)).toEqual(CREDS);
  });

  it('reuses cached credentials without a network call', async () => {
    const storage = memoryStorage();
    const fetchImpl = jest.fn(jsonResponse(CREDS));
    await ensureSyncCredentials({
      baseUrl: 'http://x',
      storage,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const again = await ensureSyncCredentials({
      baseUrl: 'http://x',
      storage,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(again).toEqual(CREDS);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('re-registers with the SAME subject when credentials expired', async () => {
    const storage = memoryStorage();
    storage._map.set(AUTH_SUBJECT_KEY, 'device-stable');
    storage._map.set(CREDENTIALS_KEY, JSON.stringify(EXPIRED_CREDS));
    const fetchImpl = jest.fn(jsonResponse(CREDS));
    const creds = await ensureSyncCredentials({
      baseUrl: 'http://x',
      storage,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(creds).toEqual(CREDS);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body)).auth_subject).toBe('device-stable');
    expect(storage._map.get(AUTH_SUBJECT_KEY)).toBe('device-stable');
  });

  it('returns null when registration fails (stays offline)', async () => {
    const storage = memoryStorage();
    const fetchImpl = jsonResponse({ error: 'invalid_json' }, false, 400);
    const creds = await ensureSyncCredentials({
      baseUrl: 'http://x',
      storage,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(creds).toBeNull();
    expect(storage._map.has(CREDENTIALS_KEY)).toBe(false);
  });
});
