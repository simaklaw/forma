import {
  createHttpOutboxTransport,
  toSyncPayloadHash,
  resolveSyncUserId,
  SYNC_LOCAL_USER_UUID,
} from './HttpOutboxTransport';
import type { OutboxRow } from './SessionRepository';
import { LOCAL_USER_ID } from '../session/currentUser';

const sampleRow: OutboxRow = {
  operationId: '00000000-0000-7000-8000-0000000000aa',
  sessionId: '00000000-0000-7000-8000-0000000000s1',
  eventId: '00000000-0000-7000-8000-0000000000e1',
  aggregateVersion: 1,
  payloadHash: 'deadbeef',
  status: 'pending',
  createdAtMs: Date.UTC(2026, 0, 1),
};

const auth = {
  userId: SYNC_LOCAL_USER_UUID,
  token: 'test-token',
};

describe('HttpOutboxTransport', () => {
  it('pads payload hash to 64 hex chars', () => {
    expect(toSyncPayloadHash('ab').length).toBe(64);
    expect(toSyncPayloadHash('ab').startsWith('ab')).toBe(true);
  });

  it('maps local-user to sync UUID', () => {
    expect(resolveSyncUserId(LOCAL_USER_ID)).toBe(SYNC_LOCAL_USER_UUID);
  });

  it('send returns accepted on 200 accepted', async () => {
    const fetchImpl = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        results: [{ client_operation_id: sampleRow.operationId, status: 'accepted' }],
      }),
    })) as unknown as typeof fetch;

    const t = createHttpOutboxTransport({
      baseUrl: 'http://localhost:8787',
      ...auth,
      fetchImpl,
    });
    await expect(t.send(sampleRow)).resolves.toBe('accepted');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body));
    expect(body.user_id).toBe(SYNC_LOCAL_USER_UUID);
    expect(body.operations[0].client_operation_id).toBe(sampleRow.operationId);
    expect(body.operations[0].payload_hash.length).toBe(64);
  });

  it('sends Authorization header when token is provided', async () => {
    const fetchImpl = jest.fn(async () => ({
      ok: true,
      json: async () => ({ results: [{ status: 'accepted' }] }),
    })) as unknown as typeof fetch;

    const t = createHttpOutboxTransport({
      baseUrl: 'http://localhost:8787',
      userId: SYNC_LOCAL_USER_UUID,
      token: 'secret-token',
      fetchImpl,
    });
    await expect(t.send(sampleRow)).resolves.toBe('accepted');
    const [, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers.authorization).toBe('Bearer secret-token');
  });

  it('returns failed when token or userId is missing (no data mix)', async () => {
    const fetchImpl = jest.fn(async () => ({
      ok: true,
      json: async () => ({ results: [{ status: 'accepted' }] }),
    })) as unknown as typeof fetch;

    const noAuth = createHttpOutboxTransport({
      baseUrl: 'http://localhost:8787',
      fetchImpl,
    });
    await expect(noAuth.send(sampleRow)).resolves.toBe('failed');
    expect(fetchImpl).not.toHaveBeenCalled();

    const tokenOnly = createHttpOutboxTransport({
      baseUrl: 'http://localhost:8787',
      token: 'x',
      fetchImpl,
    });
    await expect(tokenOnly.send(sampleRow)).resolves.toBe('failed');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('send returns accepted on duplicate', async () => {
    const fetchImpl = jest.fn(async () => ({
      ok: true,
      json: async () => ({ results: [{ status: 'duplicate' }] }),
    })) as unknown as typeof fetch;

    const t = createHttpOutboxTransport({
      baseUrl: 'http://x',
      ...auth,
      fetchImpl,
    });
    await expect(t.send(sampleRow)).resolves.toBe('accepted');
  });

  it('send returns failed on 401 (missing/wrong token)', async () => {
    const fetchImpl = jest.fn(async () => ({
      ok: false,
      status: 401,
      json: async () => ({}),
    })) as unknown as typeof fetch;

    const t = createHttpOutboxTransport({ baseUrl: 'http://x', ...auth, fetchImpl });
    await expect(t.send(sampleRow)).resolves.toBe('failed');
  });

  it('send returns failed on network error', async () => {
    const fetchImpl = jest.fn(async () => {
      throw new Error('offline');
    }) as unknown as typeof fetch;

    const t = createHttpOutboxTransport({ baseUrl: 'http://x', ...auth, fetchImpl });
    await expect(t.send(sampleRow)).resolves.toBe('failed');
  });

  it('enriches payload with status, local date, and projection', async () => {
    const fetchImpl = jest.fn(async () => ({
      ok: true,
      json: async () => ({ results: [{ status: 'accepted' }] }),
    })) as unknown as typeof fetch;

    const t = createHttpOutboxTransport({
      baseUrl: 'http://x',
      ...auth,
      fetchImpl,
      resolveEnrichment: async () => ({
        status: 'completed',
        localStartDate: '2026-09-30',
        projection: {
          setLogs: [
            {
              id: 'e1',
              exerciseId: 7,
              dateKey: '2026-09-30',
              weight: 80,
              reps: 5,
              rir: 1,
            },
          ],
          dayProgress: { '2026-09-30': { '7': 1 } },
        },
      }),
    });
    await expect(t.send(sampleRow)).resolves.toBe('accepted');
    const [, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body));
    const payload = body.operations[0].payload;
    expect(payload.status).toBe('completed');
    expect(payload.local_start_date).toBe('2026-09-30');
    expect(payload.projection.setLogs[0].exerciseId).toBe(7);
  });

  it('still pushes thin payload when resolveEnrichment throws', async () => {
    const fetchImpl = jest.fn(async () => ({
      ok: true,
      json: async () => ({ results: [{ status: 'accepted' }] }),
    })) as unknown as typeof fetch;

    const t = createHttpOutboxTransport({
      baseUrl: 'http://x',
      ...auth,
      fetchImpl,
      resolveEnrichment: async () => {
        throw new Error('sqlite locked');
      },
    });
    await expect(t.send(sampleRow)).resolves.toBe('accepted');
    const [, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body));
    const payload = body.operations[0].payload;
    expect(payload.event_id).toBe(sampleRow.eventId);
    expect(payload.projection).toBeUndefined();
  });

  it('skips enrichment fields when resolveEnrichment returns null', async () => {
    const fetchImpl = jest.fn(async () => ({
      ok: true,
      json: async () => ({ results: [{ status: 'accepted' }] }),
    })) as unknown as typeof fetch;

    const t = createHttpOutboxTransport({
      baseUrl: 'http://x',
      ...auth,
      fetchImpl,
      resolveEnrichment: async () => null,
    });
    await expect(t.send(sampleRow)).resolves.toBe('accepted');
    const [, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body));
    const payload = body.operations[0].payload;
    expect(payload.status).toBeUndefined();
    expect(payload.projection).toBeUndefined();
  });

  it('send returns failed when result status is rejected', async () => {
    const fetchImpl = jest.fn(async () => ({
      ok: true,
      json: async () => ({ results: [{ status: 'rejected' }] }),
    })) as unknown as typeof fetch;

    const t = createHttpOutboxTransport({ baseUrl: 'http://x', ...auth, fetchImpl });
    await expect(t.send(sampleRow)).resolves.toBe('failed');
  });
});
