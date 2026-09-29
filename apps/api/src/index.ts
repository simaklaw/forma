import { Hono } from 'hono';
import type {
  SyncPushRequest,
  SyncPushResponse,
  SyncPushOperationResult,
} from '@forma/sync-contract';
import type {
  IdempotencyStore,
  ChangeFeed,
  SyncUnitOfWork,
} from './store.ts';
import {
  defaultIdempotencyStore,
  defaultChangeFeed,
  MemorySyncUnitOfWork,
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
  /**
   * Transactional unit of work. Defaults to a memory pass-through built
   * from store/feed/projections; the Postgres env factory wires the real
   * transactional variant (store + feed + projections in one txn, with
   * app.current_user_id set for RLS).
   */
  uow?: SyncUnitOfWork;
  /** When true, user_id / device_id / client_operation_id / aggregate_id must be UUID. */
  requireUuid?: boolean;
  /**
   * Shared-secret API token. When set, every /api/v1/sync/* request must
   * carry `Authorization: Bearer <token>`. Interim protection against
   * IDOR until per-user JWT auth (P2) lands.
   */
  apiToken?: string;
}

function stringFrom(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
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
    apiToken,
  } = deps;
  const uow: SyncUnitOfWork =
    deps.uow ?? new MemorySyncUnitOfWork(store, feed, projections);
  const app = new Hono();

  app.get('/health', (c) =>
    c.json({
      ok: true,
      service: 'fitpulse-api',
      store: requireUuid ? 'postgres' : 'memory',
      auth: apiToken ? 'bearer' : 'open',
    }),
  );

  if (apiToken) {
    app.use('/api/v1/sync/*', async (c, next) => {
      const header = c.req.header('authorization') ?? '';
      if (header !== `Bearer ${apiToken}`) {
        return c.json({ error: 'unauthorized' }, 401);
      }
      await next();
    });
  }

  /**
   * POST /api/v1/sync/push
   * Idempotent batch from client Transactional Outbox.
   * Each operation is processed inside one unit-of-work transaction:
   * idempotency row + change-feed entry + projections commit or roll back
   * together; a lost race is answered as duplicate, never re-appended.
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

      const opPayload = (op.payload ?? {}) as Record<string, unknown>;

      const outcome = await uow.run(body.user_id, async (deps) => {
        const duplicateFor = (
          existing: NonNullable<Awaited<ReturnType<IdempotencyStore['get']>>>,
        ): SyncPushOperationResult =>
          existing.payload_hash !== op.payload_hash
            ? {
                client_operation_id: op.client_operation_id,
                status: 'rejected',
                error_code: 'payload_hash_mismatch',
                error_message:
                  'same client_operation_id with different payload_hash',
              }
            : {
                client_operation_id: op.client_operation_id,
                status: 'duplicate',
                result_body: existing.result_body,
              };

        const existing = await deps.store.get(
          body.user_id,
          op.device_id,
          op.client_operation_id,
        );
        if (existing) return duplicateFor(existing);

        const resultBody = {
          aggregate_type: op.aggregate_type,
          aggregate_id: op.aggregate_id,
        };

        const { inserted } = await deps.store.put({
          client_operation_id: op.client_operation_id,
          user_id: body.user_id,
          device_id: op.device_id,
          aggregate_type: op.aggregate_type,
          aggregate_id: op.aggregate_id,
          payload_hash: op.payload_hash,
          result_body: resultBody,
          status: 'accepted',
          // Client-reported device metadata (see ensureDevice).
          device_platform: stringFrom(opPayload.device_platform),
          app_version: stringFrom(opPayload.app_version),
        });

        if (!inserted) {
          // Another request for the same operation won the race.
          const raced = await deps.store.get(
            body.user_id,
            op.device_id,
            op.client_operation_id,
          );
          if (raced) return duplicateFor(raced);
          // Extremely unlikely (row vanished); answer duplicate without body
          // rather than re-appending a change-feed entry.
          return {
            client_operation_id: op.client_operation_id,
            status: 'duplicate',
            result_body: {},
          };
        }

        await deps.feed.append({
          user_id: body.user_id,
          entity_type: op.aggregate_type,
          entity_id: op.aggregate_id,
          entity_version: 1,
          mutation: 'upsert',
          payload: opPayload ?? resultBody,
        });

        try {
          await deps.projections.onAccepted({
            user_id: body.user_id,
            aggregate_type: op.aggregate_type,
            aggregate_id: op.aggregate_id,
            payload: opPayload ?? resultBody,
          });
        } catch (err) {
          // Projection failure must not reject an already-accepted op,
          // but it MUST be visible for debugging/replay — never silent.
          console.error(
            '[fitpulse-api] projection failed for accepted op',
            {
              client_operation_id: op.client_operation_id,
              aggregate_type: op.aggregate_type,
              aggregate_id: op.aggregate_id,
            },
            err,
          );
        }

        return {
          client_operation_id: op.client_operation_id,
          status: 'accepted',
          result_body: resultBody,
        } satisfies SyncPushOperationResult;
      });

      results.push(outcome);
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

    // Inside the unit of work so Postgres runs it with the RLS GUC set.
    const page = await uow.run(userId, (deps) =>
      deps.feed.listAfter(userId, after, limit),
    );
    return c.json(page);
  });

  return app;
}

export const app = createApp();

/** Build app from env: DATABASE_URL → Postgres stores + projections. */
export async function createAppFromEnv(): Promise<ReturnType<typeof createApp>> {
  const url = process.env.DATABASE_URL;
  const apiToken = process.env.SYNC_API_TOKEN || undefined;
  if (!url) {
    return createApp({
      store: defaultIdempotencyStore,
      feed: defaultChangeFeed,
      projections: defaultProjectionService,
      requireUuid: false,
      apiToken,
    });
  }
  const { createSql, PostgresSyncUnitOfWork } = await import('./postgres.ts');
  const sql = createSql(url);
  return createApp({
    // Store/feed/projections come from the transactional unit of work;
    // these top-level instances are only used outside transactions.
    store: new PostgresSyncUnitOfWork(sql) as unknown as IdempotencyStore,
    feed: null as unknown as ChangeFeed,
    uow: new PostgresSyncUnitOfWork(sql),
    requireUuid: true,
    apiToken,
  });
}
