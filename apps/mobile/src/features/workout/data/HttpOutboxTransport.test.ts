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
      token: 'secret-token',
      fetchImpl,
    });
    await expect(t.send(sampleRow)).resolves.toBe('accepted');
    const [, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers.authorization).toBe('Bearer secret-token');
  });

  it('omits Authorization header when no token is provided', async () => {
    const fetchImpl = jest.fn(async () => ({
      ok: true,
      json: async () => ({ results: [{ status: 'accepted' }] }),
    })) as unknown as typeof fetch;

    const t = createHttpOutboxTransport({
      baseUrl: 'http://localhost:8787',
      fetchImpl,
    });
    await t.send(sampleRow);
    const [, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers.authorization).toBeUndefined();
  });

  it('send returns accepted on duplicate', async () => {
    const fetchImpl = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        results: [{ status: 'duplicate' }],
      }),
    })) as unknown as typeof fetch;
    const t = createHttpOutboxTransport({ baseUrl: 'http://x', fetchImpl });
    await expect(t.send(sampleRow)).resolves.toBe('accepted');
  });

  it('send returns failed on 401 (missing/wrong token)', async () => {
    const fetchImpl = jest.fn(async () => ({
      ok: false,
      status: 401,
      json: async () => ({ error: 'unauthorized' }),
    })) as unknown as typeof fetch;
    const t = createHttpOutboxTransport({ baseUrl: 'http://x', fetchImpl });
    await expect(t.send(sampleRow)).resolves.toBe('failed');
  });

  it('send returns failed on network error', async () => {
    const fetchImpl = jest.fn(async () => {
      throw new Error('offline');
    }) as unknown as typeof fetch;
    const t = createHttpOutboxTransport({ baseUrl: 'http://x', fetchImpl });
    await expect(t.send(sampleRow)).resolves.toBe('failed');
  });

  it('send returns failed on non-ok HTTP', async () => {
    const fetchImpl = jest.fn(async () => ({
      ok: false,
      status: 500,
      json: async () => ({}),
    })) as unknown as typeof fetch;
    const t = createHttpOutboxTransport({ baseUrl: 'http://x', fetchImpl });
    await expect(t.send(sampleRow)).resolves.toBe('failed');
  });
});
