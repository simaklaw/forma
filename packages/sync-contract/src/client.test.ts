import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createSyncClient, SyncApiError } from './client.ts';

interface RecordedCall {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
}

function stubFetch(status: number, bodyText: string) {
  const calls: RecordedCall[] = [];
  const fetch = async (url: string, init: any) => {
    calls.push({
      url,
      method: init.method,
      headers: init.headers,
      body: init.body,
    });
    return {
      ok: status >= 200 && status < 300,
      status,
      text: async () => bodyText,
    };
  };
  return { calls, fetch };
}

describe('createSyncClient', () => {
  it('push sends POST with bearer auth and returns typed response', async () => {
    const stub = stubFetch(
      200,
      JSON.stringify({
        results: [{ client_operation_id: 'op1', status: 'accepted' }],
      }),
    );
    const client = createSyncClient({
      baseUrl: 'https://api.example.com/',
      token: 'jwt-token',
      fetch: stub.fetch as any,
    });
    const res = await client.push({ user_id: 'u1', operations: [] });
    assert.equal(res.results.length, 1);
    assert.equal(res.results[0].status, 'accepted');
    assert.equal(stub.calls.length, 1);
    assert.equal(stub.calls[0].method, 'POST');
    assert.equal(
      stub.calls[0].url,
      'https://api.example.com/api/v1/sync/push',
    );
    assert.equal(stub.calls[0].headers.authorization, 'Bearer jwt-token');
    const sent = JSON.parse(stub.calls[0].body ?? '{}');
    assert.equal(sent.user_id, 'u1');
  });

  it('pull builds cursor query and omits auth header without token', async () => {
    const stub = stubFetch(
      200,
      JSON.stringify({ changes: [], next_change_id: 7, has_more: false }),
    );
    const client = createSyncClient({
      baseUrl: 'https://api.example.com',
      fetch: stub.fetch as any,
    });
    const res = await client.pull({ after_change_id: 5, limit: 50 });
    assert.equal(res.next_change_id, 7);
    assert.equal(res.has_more, false);
    assert.equal(
      stub.calls[0].url,
      'https://api.example.com/api/v1/sync/pull?after_change_id=5&limit=50',
    );
    assert.equal(stub.calls[0].headers.authorization, undefined);
  });

  it('pull includes url-encoded user_id when given', async () => {
    const stub = stubFetch(
      200,
      JSON.stringify({ changes: [], next_change_id: 0, has_more: false }),
    );
    const client = createSyncClient({
      baseUrl: 'http://localhost:8787',
      fetch: stub.fetch as any,
    });
    await client.pull({ user_id: 'user 1', after_change_id: 0 });
    assert.equal(
      stub.calls[0].url,
      'http://localhost:8787/api/v1/sync/pull?user_id=user%201&after_change_id=0',
    );
  });

  it('throws SyncApiError with parsed error body on 400', async () => {
    const stub = stubFetch(
      400,
      JSON.stringify({
        error: 'invalid_body',
        message: 'bad',
        issues: [
          { path: 'user_id', code: 'invalid_type', message: 'required' },
        ],
      }),
    );
    const client = createSyncClient({
      baseUrl: 'https://api.example.com',
      token: 't',
      fetch: stub.fetch as any,
    });
    await assert.rejects(
      () => client.push({ user_id: 'u1', operations: [] }),
      (err: unknown) => {
        assert.ok(err instanceof SyncApiError);
        assert.equal((err as SyncApiError).status, 400);
        const body = (err as SyncApiError).body as {
          error: string;
          issues: unknown[];
        };
        assert.equal(body.error, 'invalid_body');
        assert.equal(body.issues.length, 1);
        return true;
      },
    );
  });

  it('keeps raw text when the error body is not JSON', async () => {
    const stub = stubFetch(502, 'bad gateway');
    const client = createSyncClient({
      baseUrl: 'https://api.example.com',
      fetch: stub.fetch as any,
    });
    await assert.rejects(
      () => client.pull({ after_change_id: 0 }),
      (err: unknown) => {
        assert.ok(err instanceof SyncApiError);
        assert.equal((err as SyncApiError).body, 'bad gateway');
        return true;
      },
    );
  });
});
