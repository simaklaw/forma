import { Hono } from 'hono';
import type {
  SyncPushRequest,
  SyncPushResponse,
  SyncPushOperationResult,
} from '@forma/sync-contract';
import type { IdempotencyStore, ChangeFeed } from './store.ts';
import {
  defaultIdempotencyStore,
  defaultChangeFeed,
} from './idempotency.ts';
import {
  defaultProjectionService,
  type ProjectionService,
} from './projections.ts';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface AppDeps {
  store: IdempotencyStore;
  feed: ChangeFeed;
  projections?: ProjectionService;
  /** When true, user_id / device_id / client_operation_id / aggregate_id must be UUID. */
  requireUuid?: boolean;
}

export function createApp(
  deps: AppDeps = {
    store: defaultIdempotencyStore,
    feed: defaultChangeFeed,
    projections: defaultProjectionService,
  },
) {
  const {
    store,
    feed,
    projections = defaultProjectionService,
    requireUuid = false,
  } = deps;
  const app = new Hono();

  app.get('/health', (c) =>
    c.json({
      ok: true,
      service: 'fitpulse-api',
      store: requireUuid ? 'postgres' : 'memory',
    }),
  );

  /**
   * POST /api/v1/sync/push
   * Idempotent batch from client Transactional Outbox.
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

    if (requireUuid && !UUID_RE.test(body.user_id)) {
      return c.json({ error: 'user_id_must_be_uuid' }, 400);
    }

    const results: SyncPushOperationResult[] = [];

    for (const op of body.operations) {
      if (!op.client_operation_id || !op.payload_hash || !op.device_id) {
        results.push({
          client_operation_id: op.client_operation_id ?? '',
          status: 'rejected',
          error_code: 'missing_fields',
          error_message:
            'client_operation_id, device_id and payload_hash required',
        });
        continue;
      }

      if (op.payload_hash.length !== 64) {
        results.push({
          client_operation_id: op.client_operation_id,
          status: 'rejected',
          error_code: 'invalid_payload_hash',
          error_message: 'payload_hash must be 64-char hex SHA-256',
        });
        continue;
      }

      if (requireUuid) {
        const ids = [
          op.client_operation_id,
          op.device_id,
          op.aggregate_id,
        ];
        if (ids.some((id) => !UUID_RE.test(id))) {
          results.push({
            client_operation_id: op.client_operation_id,
            status: 'rejected',
            error_code: 'ids_must_be_uuid',
            error_message:
              'client_operation_id, device_id, aggregate_id must be UUID',
          });
          continue;
        }
      }

      const existing = await store.get(
        body.user_id,
        op.device_id,
        op.client_operation_id,
      );
      if (existing) {
        if (existing.payload_hash !== op.payload_hash) {
          results.push({
            client_operation_id: op.client_operation_id,
            status: 'rejected',
            error_code: 'payload_hash_mismatch',
            error_message:
              'same client_operation_id with different payload_hash',
          });
          continue;
        }
        results.push({
          client_operation_id: op.client_operation_id,
          status: 'duplicate',
          result_body: existing.result_body,
        });
        continue;
      }

      const resultBody = {
        aggregate_type: op.aggregate_type,
        aggregate_id: op.aggregate_id,
      };

      await store.put({
        client_operation_id: op.client_operation_id,
        user_id: body.user_id,
        device_id: op.device_id,
        aggregate_type: op.aggregate_type,
        aggregate_id: op.aggregate_id,
        payload_hash: op.payload_hash,
        result_body: resultBody,
        status: 'accepted',
      });

      await feed.append({
        user_id: body.user_id,
        entity_type: op.aggregate_type,
        entity_id: op.aggregate_id,
        entity_version: 1,
        mutation: 'upsert',
        payload: op.payload ?? resultBody,
      });

      try {
        await projections.onAccepted({
          user_id: body.user_id,
          aggregate_type: op.aggregate_type,
          aggregate_id: op.aggregate_id,
          payload: (op.payload as Record<string, unknown>) ?? resultBody,
        });
      } catch {
        // Projection failure must not reject an already-accepted op.
      }

      results.push({
        client_operation_id: op.client_operation_id,
        status: 'accepted',
        result_body: resultBody,
      });
    }

    return c.json({ results } satisfies SyncPushResponse);
  });

  app.get('/api/v1/sync/pull', async (c) => {
    const after = Number(c.req.query('after_change_id') ?? '0');
    if (!Number.isFinite(after) || after < 0) {
      return c.json({ error: 'invalid_after_change_id' }, 400);
    }

    const userId = c.req.query('user_id') ?? '';
    if (!userId) {
      return c.json({
        changes: [],
        next_change_id: after,
        has_more: false,
      });
    }

    if (requireUuid && !UUID_RE.test(userId)) {
      return c.json({ error: 'user_id_must_be_uuid' }, 400);
    }

    const limit = Math.min(
      Math.max(Number(c.req.query('limit') ?? '100') || 100, 1),
      500,
    );

    const page = await feed.listAfter(userId, after, limit);
    return c.json(page);
  });

  return app;
}

export const app = createApp();

/** Build app from env: DATABASE_URL → Postgres stores + projections. */
export async function createAppFromEnv(): Promise<ReturnType<typeof createApp>> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    return createApp({
      store: defaultIdempotencyStore,
      feed: defaultChangeFeed,
      projections: defaultProjectionService,
      requireUuid: false,
    });
  }
  const {
    createSql,
    PostgresIdempotencyStore,
    PostgresChangeFeed,
  } = await import('./postgres.ts');
  const { PostgresProjectionService } = await import('./projections.ts');
  const sql = createSql(url);
  return createApp({
    store: new PostgresIdempotencyStore(sql),
    feed: new PostgresChangeFeed(sql),
    projections: new PostgresProjectionService(sql),
    requireUuid: true,
  });
}
