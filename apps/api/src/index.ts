import { Hono } from 'hono';
import type {
  SyncPushRequest,
  SyncPushResponse,
  SyncPullResponse,
  SyncPushOperationResult,
} from '@forma/sync-contract';
import {
  defaultIdempotencyStore,
  type MemoryIdempotencyStore,
} from './idempotency.ts';

export function createApp(store: MemoryIdempotencyStore = defaultIdempotencyStore) {
  const app = new Hono();

  app.get('/health', (c) => c.json({ ok: true, service: 'fitpulse-api' }));

  /**
   * POST /api/v1/sync/push
   * Idempotent batch from client Transactional Outbox.
   * In-memory store until platform.client_operation is wired.
   */
  app.post('/api/v1/sync/push', async (c) => {
    let body: SyncPushRequest;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: 'invalid_json' }, 400);
    }

    if (!body?.user_id || !Array.isArray(body.operations)) {
      return c.json({ error: 'invalid_body' }, 400);
    }

    const results: SyncPushOperationResult[] = body.operations.map((op) => {
      if (!op.client_operation_id || !op.payload_hash || !op.device_id) {
        return {
          client_operation_id: op.client_operation_id ?? '',
          status: 'rejected' as const,
          error_code: 'missing_fields',
          error_message:
            'client_operation_id, device_id and payload_hash required',
        };
      }

      if (op.payload_hash.length !== 64) {
        return {
          client_operation_id: op.client_operation_id,
          status: 'rejected' as const,
          error_code: 'invalid_payload_hash',
          error_message: 'payload_hash must be 64-char hex SHA-256',
        };
      }

      const existing = store.get(
        body.user_id,
        op.device_id,
        op.client_operation_id,
      );
      if (existing) {
        if (existing.payload_hash !== op.payload_hash) {
          return {
            client_operation_id: op.client_operation_id,
            status: 'rejected' as const,
            error_code: 'payload_hash_mismatch',
            error_message:
              'same client_operation_id with different payload_hash',
          };
        }
        return {
          client_operation_id: op.client_operation_id,
          status: 'duplicate' as const,
          result_body: existing.result_body,
        };
      }

      const resultBody = {
        stub: true,
        aggregate_type: op.aggregate_type,
        aggregate_id: op.aggregate_id,
      };
      store.put({
        client_operation_id: op.client_operation_id,
        user_id: body.user_id,
        device_id: op.device_id,
        payload_hash: op.payload_hash,
        status: 'accepted',
        result_body: resultBody,
      });

      return {
        client_operation_id: op.client_operation_id,
        status: 'accepted' as const,
        result_body: resultBody,
      };
    });

    return c.json({ results } satisfies SyncPushResponse);
  });

  /**
   * GET /api/v1/sync/pull?after_change_id=N
   * Monotonic change feed from platform.sync_change.
   * Skeleton: empty page until DB is wired.
   */
  app.get('/api/v1/sync/pull', (c) => {
    const after = Number(c.req.query('after_change_id') ?? '0');
    if (!Number.isFinite(after) || after < 0) {
      return c.json({ error: 'invalid_after_change_id' }, 400);
    }

    const res: SyncPullResponse = {
      changes: [],
      next_change_id: after,
      has_more: false,
    };
    return c.json(res);
  });

  return app;
}

/** Default app instance (shared in-memory store) for tests and local run. */
export const app = createApp();
