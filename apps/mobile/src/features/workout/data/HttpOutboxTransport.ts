import type { OutboxRow } from './SessionRepository';
import type { OutboxTransport } from './OutboxDrainService';
import { LOCAL_USER_ID } from '../session/currentUser';
import { projectSessionEvents, type SessionProjection } from './sessionProjections';
import { getSessionService } from './createSessionService';
import { createLogger } from '@/core/logger';

const log = createLogger('http-outbox');

/** Prefer injected fetch; fall back to global only when present. */
function defaultFetch(): typeof fetch {
  if (typeof globalThis.fetch === 'function') {
    return globalThis.fetch.bind(globalThis);
  }
  throw new Error('fetch_unavailable');
}

/**
 * Until real auth, map the local placeholder user to a fixed UUID so
 * Postgres FK / requireUuid paths accept the payload.
 * Prefer JWT user_id from syncAuth when available (wired by bootstrap).
 */
export const SYNC_LOCAL_USER_UUID = '00000000-0000-4000-8000-000000000001';
export const SYNC_LOCAL_DEVICE_UUID = '00000000-0000-4000-8000-0000000000d1';

export function resolveSyncUserId(localUserId: string = LOCAL_USER_ID): string {
  if (localUserId === LOCAL_USER_ID || localUserId === 'local-user') {
    return SYNC_LOCAL_USER_UUID;
  }
  return localUserId;
}

/** API expects 64-char hex; local FNV hash is shorter — pad for contract match. */
export function toSyncPayloadHash(localHash: string): string {
  const h = localHash.toLowerCase().replace(/[^0-9a-f]/g, '');
  if (h.length >= 64) return h.slice(0, 64);
  return h.padEnd(64, '0');
}

/**
 * Fields merged into the sync push payload so:
 * - activity_credit sees terminal status + local date
 * - change feed / pull can hydrate peers via payload.projection
 */
export type PushSessionEnrichment = {
  status: string;
  localStartDate: string;
  projection: SessionProjection;
};

export type HttpOutboxTransportOptions = {
  baseUrl: string;
  /**
   * Per-user JWT (preferred) or legacy shared SYNC_API_TOKEN.
   * Sent as Authorization: Bearer <token>.
   */
  token?: string;
  /** Defaults to SYNC_LOCAL_DEVICE_UUID. */
  deviceId?: string;
  /** Required for send — JWT-derived user_id from syncAuth. */
  userId?: string;
  fetchImpl?: typeof fetch;
  /**
   * Build enrichment for a session. Defaults to loading the local aggregate
   * + events and running projectSessionEvents.
   */
  resolveEnrichment?: (
    sessionId: string,
  ) => Promise<PushSessionEnrichment | null>;
};

/** Default: project local session journal into setLogs / dayProgress. */
export async function defaultResolveEnrichment(
  sessionId: string,
): Promise<PushSessionEnrichment | null> {
  try {
    const svc = getSessionService();
    const session = await svc.getSession(sessionId);
    if (!session) return null;
    const events = await svc.listEvents(sessionId);
    const projection = projectSessionEvents(session, events);
    return {
      status: session.status,
      localStartDate: session.localStartDate,
      projection,
    };
  } catch {
    return null;
  }
}

/**
 * Pushes one outbox row to FitPulse sync API (POST /api/v1/sync/push).
 * Network errors → 'failed' (row stays retryable after mark failed).
 *
 * Payload enrichment (best-effort): status, local_start_date, projection.
 * payload_hash stays the local event hash — idempotency key is unchanged.
 */
export function createHttpOutboxTransport(
  opts: HttpOutboxTransportOptions,
): OutboxTransport {
  const base = opts.baseUrl.replace(/\/$/, '');
  const deviceId = opts.deviceId ?? SYNC_LOCAL_DEVICE_UUID;
  // Prefer explicit JWT-derived userId; only fall back to local map when set.
  const userId = opts.userId;
  const token = opts.token;
  const fetchFn = opts.fetchImpl ?? defaultFetch();
  const resolveEnrichment = opts.resolveEnrichment ?? defaultResolveEnrichment;

  return {
    async send(row: OutboxRow): Promise<'accepted' | 'failed'> {
      if (!userId || !token) {
        log.warn('outbox send skipped: missing userId or token');
        return 'failed';
      }

      const headers: Record<string, string> = {
        'content-type': 'application/json',
        accept: 'application/json',
        authorization: `Bearer ${token}`,
      };

      const payload: Record<string, unknown> = {
        event_id: row.eventId,
        aggregate_version: row.aggregateVersion,
      };
      // Enrichment is best-effort: failures must not block the push itself.
      try {
        const enrichment = await resolveEnrichment(row.sessionId);
        if (enrichment) {
          payload.status = enrichment.status;
          payload.session_status = enrichment.status;
          payload.local_start_date = enrichment.localStartDate;
          payload.local_date = enrichment.localStartDate;
          payload.projection = enrichment.projection;
        }
      } catch (err) {
        log.warn('resolveEnrichment failed; pushing thin payload', {
          sessionId: row.sessionId,
          err: err instanceof Error ? err.message : String(err),
        });
      }

      const body = {
        user_id: userId,
        operations: [
          {
            client_operation_id: row.operationId,
            device_id: deviceId,
            aggregate_type: 'workout_session',
            aggregate_id: row.sessionId,
            payload_hash: toSyncPayloadHash(row.payloadHash),
            payload,
            occurred_at_client: new Date(row.createdAtMs).toISOString(),
          },
        ],
      };

      try {
        const res = await fetchFn(`${base}/api/v1/sync/push`, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        });
        if (!res.ok) return 'failed';
        const json = (await res.json()) as {
          results?: Array<{ status?: string }>;
        };
        const status = json.results?.[0]?.status;
        if (status === 'accepted' || status === 'duplicate') return 'accepted';
        return 'failed';
      } catch {
        return 'failed';
      }
    },
  };
}

/**
 * Build transport from Expo public env, or null if unset (keep noop).
 * Prefer bootstrapOutboxDrain + syncAuth (per-user JWT).
 * EXPO_PUBLIC_SYNC_API_URL=http://10.0.2.2:8787
 * EXPO_PUBLIC_SYNC_API_TOKEN — legacy shared secret only.
 */
export function createHttpOutboxTransportFromEnv(): OutboxTransport | null {
  const base =
    (typeof process !== 'undefined' &&
      process.env?.EXPO_PUBLIC_SYNC_API_URL) ||
    '';
  if (!base || typeof base !== 'string') return null;
  const token =
    (typeof process !== 'undefined' &&
      process.env?.EXPO_PUBLIC_SYNC_API_TOKEN) ||
    undefined;
  // Legacy shared-token path only — prefer bootstrapOutboxDrain + syncAuth.
  if (!token) return null;
  return createHttpOutboxTransport({
    baseUrl: base,
    token,
    userId: resolveSyncUserId(),
  });
}
