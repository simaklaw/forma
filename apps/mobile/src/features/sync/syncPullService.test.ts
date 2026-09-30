import {
  SyncPullService,
  fetchPullPage,
  isPullPage,
  loadCursor,
  saveCursor,
  PULL_CURSOR_KEY,
  type PullChange,
  type PullPage,
} from './syncPullService';

function memoryStorage(initial?: Record<string, string>) {
  const m = new Map<string, string>(Object.entries(initial ?? {}));
  return {
    getItem: async (k: string) => (m.has(k) ? (m.get(k) as string) : null),
    setItem: async (k: string, v: string) => {
      m.set(k, v);
    },
    _map: m,
  };
}

function pageOf(
  changeIds: number[],
  next: number,
  hasMore: boolean,
): PullPage {
  return {
    changes: changeIds.map((id) => ({
      change_id: id,
      entity_type: 'workout_session',
      entity_id: 'e' + id,
      entity_version: 1,
      mutation: 'upsert',
      payload: { n: id },
    })),
    next_change_id: next,
    has_more: hasMore,
  };
}

function fetchReturning(pages: PullPage[]) {
  let call = 0;
  return jest.fn(async () => {
    const body = pages[Math.min(call, pages.length - 1)];
    call += 1;
    return { ok: true, json: async () => body };
  });
}

const CREDS_BODY = {
  user_id: '11111111-2222-5333-8444-555555555555',
  token: 'jwt.abc',
  expires_at: '2099-01-01T00:00:00.000Z',
};

describe('pull primitives', () => {
  it('isPullPage validates shape', () => {
    expect(isPullPage(pageOf([1], 1, false))).toBe(true);
    expect(isPullPage({ changes: [], next_change_id: 'x', has_more: false })).toBe(false);
    expect(isPullPage(null)).toBe(false);
  });

  it('cursor round-trips through storage; garbage resets to 0', async () => {
    const storage = memoryStorage({ [PULL_CURSOR_KEY]: '42' });
    expect(await loadCursor(storage)).toBe(42);
    await saveCursor(storage, 43);
    expect(storage._map.get(PULL_CURSOR_KEY)).toBe('43');
    const bad = memoryStorage({ [PULL_CURSOR_KEY]: 'not-a-number' });
    expect(await loadCursor(bad)).toBe(0);
  });

  it('fetchPullPage sends token and after cursor, no user_id', async () => {
    const fetchImpl = fetchReturning([pageOf([1], 1, false)]);
    const page = await fetchPullPage({
      baseUrl: 'http://x/',
      token: 'jwt.abc',
      after: 7,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(page.next_change_id).toBe(1);
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('after_change_id=7');
    expect(url).not.toContain('user_id');
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer jwt.abc');
  });

  it('fetchPullPage throws on HTTP failure and malformed body', async () => {
    const failing = jest.fn(async () => ({ ok: false, status: 403 }));
    await expect(
      fetchPullPage({
        baseUrl: 'http://x',
        token: 't',
        after: 0,
        fetchImpl: failing as unknown as typeof fetch,
      }),
    ).rejects.toThrow('pull_failed_403');
    const malformed = jest.fn(async () => ({ ok: true, json: async () => ({}) }));
    await expect(
      fetchPullPage({
        baseUrl: 'http://x',
        token: 't',
        after: 0,
        fetchImpl: malformed as unknown as typeof fetch,
      }),
    ).rejects.toThrow('pull_invalid_response');
  });
});

describe('SyncPullService', () => {
  it('applies pages until has_more is false and persists the cursor', async () => {
    const storage = memoryStorage();
    const applied: number[] = [];
    const applier = {
      apply: (c: PullChange) => {
        applied.push(c.change_id);
        return true;
      },
    };
    // First call: registration; then pull pages 1, 2.
    const fetchImpl = jest.fn(async (url?: unknown) => {
      const u = String(url);
      if (u.includes('/auth/register')) {
        return { ok: true, json: async () => CREDS_BODY };
      }
      if (u.includes('after_change_id=0')) {
        return { ok: true, json: async () => pageOf([1, 2], 2, true) };
      }
      return { ok: true, json: async () => pageOf([3], 3, false) };
    });
    const svc = new SyncPullService({
      baseUrl: 'http://x',
      storage,
      applier,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const result = await svc.pullOnce();
    expect(result.offline).toBe(false);
    expect(result.pages).toBe(2);
    expect(applied).toEqual([1, 2, 3]);
    expect(result.cursor).toBe(3);
    expect(storage._map.get(PULL_CURSOR_KEY)).toBe('3');
  });

  it('counts skipped changes separately', async () => {
    const storage = memoryStorage();
    const applier = {
      apply: (c: PullChange) => c.payload.n === 2,
    };
    const fetchImpl = jest.fn(async (url?: unknown) => {
      const u = String(url);
      if (u.includes('/auth/register')) {
        return { ok: true, json: async () => CREDS_BODY };
      }
      return { ok: true, json: async () => pageOf([1, 2], 2, false) };
    });
    const svc = new SyncPullService({
      baseUrl: 'http://x',
      storage,
      applier,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const result = await svc.pullOnce();
    expect(result.applied).toBe(1);
    expect(result.skipped).toBe(1);
  });

  it('resumes from the stored cursor without re-reading old changes', async () => {
    const storage = memoryStorage({ [PULL_CURSOR_KEY]: '5' });
    const seenAfters: string[] = [];
    const fetchImpl = jest.fn(async (url?: unknown) => {
      const u = String(url);
      if (u.includes('/auth/register')) {
        return { ok: true, json: async () => CREDS_BODY };
      }
      seenAfters.push(u);
      return { ok: true, json: async () => pageOf([6], 6, false) };
    });
    const svc = new SyncPullService({
      baseUrl: 'http://x',
      storage,
      applier: { apply: () => true },
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const result = await svc.pullOnce();
    expect(result.cursor).toBe(6);
    expect(seenAfters[0]).toContain('after_change_id=5');
  });

  it('offline when registration fails: cursor untouched', async () => {
    const storage = memoryStorage({ [PULL_CURSOR_KEY]: '9' });
    const fetchImpl = jest.fn(async () => ({ ok: false, status: 500 }));
    const svc = new SyncPullService({
      baseUrl: 'http://x',
      storage,
      applier: { apply: () => true },
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const result = await svc.pullOnce();
    expect(result.offline).toBe(true);
    expect(result.cursor).toBe(0);
    expect(storage._map.get(PULL_CURSOR_KEY)).toBe('9');
  });

  it('partial failure mid-pagination keeps applied pages', async () => {
    const storage = memoryStorage();
    const applied: number[] = [];
    const fetchImpl = jest.fn(async (url?: unknown) => {
      const u = String(url);
      if (u.includes('/auth/register')) {
        return { ok: true, json: async () => CREDS_BODY };
      }
      if (u.includes('after_change_id=0')) {
        return { ok: true, json: async () => pageOf([1], 1, true) };
      }
      return { ok: false, status: 503 };
    });
    const svc = new SyncPullService({
      baseUrl: 'http://x',
      storage,
      applier: {
        apply: (c) => {
          applied.push(c.change_id);
          return true;
        },
      },
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const result = await svc.pullOnce();
    expect(result.offline).toBe(false);
    expect(applied).toEqual([1]);
    expect(result.cursor).toBe(1);
    expect(storage._map.get(PULL_CURSOR_KEY)).toBe('1');
  });
});
