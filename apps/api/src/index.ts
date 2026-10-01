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
import {
  signJwt,
  verifyJwt,
  JWT_TTL_SECONDS,
  type UserRegistry,
} from './auth.ts';
import {
  verifyIdToken,
  claimsToAuthSubject,
  type OidcProvider,
  type OidcConfig,
  oidcConfigFromEnv,
  exchangeMailruAuthorizationCode,
  isAllowedOidcRedirectUri,
  createOidcRateLimiter,
} from './oidc.ts';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface AppDeps {
  store: IdempotencyStore;
  feed: ChangeFeed;
  projections?: ProjectionService;
  uow?: SyncUnitOfWork;
  requireUuid?: boolean;
  apiToken?: string;
  jwtSecret?: string;
  registerUser?: UserRegistry;
  oidcConfig?: OidcConfig;
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
    jwtSecret,
    registerUser,
    oidcConfig,
  } = deps;
  const uow: SyncUnitOfWork =
    deps.uow ?? new MemorySyncUnitOfWork(store, feed, projections);
  const app = new Hono<{ Variables: { authUserId: string } }>();
  const oidcRateLimit = createOidcRateLimiter({ windowMs: 60_000, max: 30 });

  app.get('/health', (c) =>
    c.json({
      ok: true,
      service: 'fitpulse-api',
      store: requireUuid ? 'postgres' : 'memory',
      auth: jwtSecret ? 'jwt' : apiToken ? 'bearer' : 'open',
    }),
  );

  if (jwtSecret && registerUser) {
    app.post('/api/v1/auth/register', async (c) => {
      let body: { auth_subject?: unknown };
      try {
        body = await c.req.json();
      } catch {
        return c.json({ error: 'invalid_json' }, 400);
      }
      const subject = stringFrom(body?.auth_subject);
      if (!subject || subject.length < 3 || subject.length > 200) {
        return c.json(
          {
            error: 'invalid_auth_subject',
            message: 'auth_subject must be 3-200 chars',
          },
          400,
        );
      }
      const { user_id, created } = await registerUser.register(subject);
      const token = signJwt(jwtSecret, user_id);
      const expiresAt = new Date(
        Date.now() + JWT_TTL_SECONDS * 1000,
      ).toISOString();
      return c.json({ user_id, created, token, expires_at: expiresAt });
    });
  }

  if (jwtSecret && registerUser && oidcConfig) {
    app.post('/api/v1/auth/oidc', async (c) => {
      let body: {
        provider?: unknown;
        id_token?: unknown;
        code?: unknown;
        redirect_uri?: unknown;
        code_verifier?: unknown;
      };
      try {
        body = await c.req.json();
      } catch {
        return c.json({ error: 'invalid_json' }, 400);
      }
      const provider = stringFrom(body?.provider) as OidcProvider | undefined;
      let idToken = stringFrom(body?.id_token);
      const code = stringFrom(body?.code);
      const redirectUri = stringFrom(body?.redirect_uri);
      const codeVerifier = stringFrom(body?.code_verifier);
      const clientKey =
        c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
        c.req.header('cf-connecting-ip') ||
        'unknown';
      if (!oidcRateLimit(clientKey)) {
        return c.json({ error: 'rate_limited' }, 429);
      }
      if (provider !== 'mailru' && provider !== 'vk') {
        return c.json(
          { error: 'invalid_provider', message: 'provider must be mailru|vk' },
          400,
        );
      }
      try {
        if (!idToken && code && provider === 'mailru') {
          if (!redirectUri || !isAllowedOidcRedirectUri(redirectUri)) {
            return c.json(
              {
                error: 'invalid_redirect_uri',
                message: 'redirect_uri must be an allowlisted mobile URI',
              },
              400,
            );
          }
          const tokens = await exchangeMailruAuthorizationCode(
            {
              code,
              redirectUri,
              codeVerifier: codeVerifier || undefined,
            },
            oidcConfig,
          );
          idToken = tokens.id_token ?? '';
          if (!idToken || idToken.length < 20) {
            return c.json(
              {
                error: 'mailru_no_id_token',
                message:
                  'Token endpoint did not return id_token. Enable OIDC scopes for the Mail.ru app.',
              },
              400,
            );
          }
        }
        if (!idToken || idToken.length < 20 || idToken.length > 8192) {
          return c.json({ error: 'invalid_id_token' }, 400);
        }
        const claims = await verifyIdToken(provider, idToken, oidcConfig);
        const subject = claimsToAuthSubject(provider, claims);
        const { user_id, created } = await registerUser.register(subject);
        const token = signJwt(jwtSecret, user_id);
        const expiresAt = new Date(
          Date.now() + JWT_TTL_SECONDS * 1000,
        ).toISOString();
        return c.json({
          user_id,
          created,
          token,
          expires_at: expiresAt,
          auth_subject: subject,
          provider,
        });
      } catch (e) {
        const err = e as { name?: string; code?: string; message?: string };
        if (err?.name === 'OidcError' && typeof err.code === 'string') {
          const status =
            err.code === 'provider_not_configured'
              ? 503
              : err.code === 'expired'
                ? 401
                : err.code === 'jwks_unavailable'
                  ? 502
                  : 401;
          return c.json(
            { error: err.code, message: err.message ?? err.code },
            status,
          );
        }
        throw e;
      }
    });
  }

  if (jwtSecret) {
    app.use('/api/v1/sync/*', async (c, next) => {
      const header = c.req.header('authorization') ?? '';
      if (!header.startsWith('Bearer ')) {
        return c.json({ error: 'unauthorized' }, 401);
      }
      const subject = verifyJwt(jwtSecret, header.slice('Bearer '.length));
      if (!subject) {
        return c.json({ error: 'unauthorized' }, 401);
      }
      c.set('authUserId', subject);
      await next();
    });
  } else if (apiToken) {
    app.use('/api/v1/sync/*', async (c, next) => {
      const header = c.req.header('authorization') ?? '';
      if (header !== `Bearer ${apiToken}`) {
        return c.json({ error: 'unauthorized' }, 401);
      }
      await next();
    });
  }

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

    if (jwtSecret && body.user_id !== c.get('authUserId')) {
      return c.json({ error: 'user_mismatch' }, 403);
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
        const ids = [op.client_operation_id, op.device_id, op.aggregate_id];
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
          device_platform: stringFrom(opPayload.device_platform),
          app_version: stringFrom(opPayload.app_version),
        });

        if (!inserted) {
          const raced = await deps.store.get(
            body.user_id,
            op.device_id,
            op.client_operation_id,
          );
          if (raced) return duplicateFor(raced);
          return {
            client_operation_id: op.client_operation_id,
            status: 'duplicate',
            result_body: {},
          } satisfies SyncPushOperationResult;
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
            device_id: op.device_id,
          });
        } catch (err) {
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

    let userId = c.req.query('user_id') ?? '';

    if (jwtSecret) {
      const authUserId = c.get('authUserId');
      if (!userId) {
        userId = authUserId;
      } else if (userId !== authUserId) {
        return c.json({ error: 'user_mismatch' }, 403);
      }
    }

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

    const page = await uow.run(userId, (deps) =>
      deps.feed.listAfter(userId, after, limit),
    );
    return c.json(page);
  });

  return app;
}

export const app = createApp();

export async function createAppFromEnv(): Promise<ReturnType<typeof createApp>> {
  const url = process.env.DATABASE_URL;
  const apiToken = process.env.SYNC_API_TOKEN || undefined;
  const jwtSecret = process.env.JWT_SECRET || undefined;
  const oidcConfig = oidcConfigFromEnv();
  if (!url) {
    const { MemoryUserRegistry } = await import('./auth.ts');
    return createApp({
      store: defaultIdempotencyStore,
      feed: defaultChangeFeed,
      projections: defaultProjectionService,
      requireUuid: false,
      apiToken,
      jwtSecret,
      registerUser: jwtSecret ? new MemoryUserRegistry() : undefined,
      oidcConfig,
    });
  }
  const {
    createSql,
    PostgresIdempotencyStore,
    PostgresChangeFeed,
    PostgresSyncUnitOfWork,
  } = await import('./postgres.ts');
  const { PostgresProjectionService } = await import('./projections.ts');
  const { PostgresUserRegistry } = await import('./auth.ts');
  const sql = createSql(url);
  return createApp({
    store: new PostgresIdempotencyStore(sql),
    feed: new PostgresChangeFeed(sql),
    projections: new PostgresProjectionService(sql),
    uow: new PostgresSyncUnitOfWork(sql),
    requireUuid: true,
    apiToken,
    jwtSecret,
    registerUser: jwtSecret ? new PostgresUserRegistry(sql) : undefined,
    oidcConfig,
  });
}
