import { Hono } from 'hono';
import type {
  SyncPushRequest,
  SyncPushResponse,
  SyncPullResponse,
} from '@forma/sync-contract';

const app = new Hono();

app.get('/health', (c) => c.json({ ok: true, service: 'fitpulse-api' }));

/**
 * POST /api/v1/sync/push
 * Idempotent batch from client Transactional Outbox.
 * Skeleton: validates shape, returns accepted for every op (no DB yet).
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

  const results: SyncPushResponse['results'] = body.operations.map((op) => {
    if (!op.client_operation_id || !op.payload_hash) {
      return {
        client_operation_id: op.client_operation_id ?? '',
        status: 'rejected' as const,
        error_code: 'missing_fields',
        error_message: 'client_operation_id and payload_hash required',
      };
    }
    return {
      client_operation_id: op.client_operation_id,
      status: 'accepted' as const,
      result_body: { stub: true },
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

export { app };

// Optional local listen: pnpm --filter @forma/api exec tsx -e "import { app } from './src/index.ts'; import { serve } from '@hono/node-server'; serve({ fetch: app.fetch, port: 8787 })"
