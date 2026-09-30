import type { OutboxRow } from './SessionRepository';
import type { OutboxTransport } from './OutboxDrainService';
import { LOCAL_USER_ID } from '../session/currentUser';
import { projectSessionEvents, type SessionProjection } from './sessionProjections';
import { getSessionService } from './createSessionService';

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
  /** Defaults to resolveSyncUserId(). Prefer JWT-derived user_id. */
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
  const userId = opts.userId ?? resolveSyncUserId();
  const token = opts.token;
  const fetchFn = opts.fetchImpl ?? globalThis.fetch.bind(globalThis);
  const resolveEnrichment = opts.resolveEnrichment ?? defaultResolveEnrichment;

  return {
    async send(row: OutboxRow): Promise<'accepted' | 'failed'> {
      const headers: Record<string, string> = {
        'content-type': 'application/json',
        accept: 'application/json',
      };
      if (token) headers.authorization = `Bearer ${token}`;

      const enrichment = await resolveEnrichment(row.sessionId);
      const payload: Record<string, unknown> = {
        event_id: row.eventId,
        aggregate_version: row.aggregateVersion,
      };
      if (enrichment) {
        payload.status = enrichment.status;
        payload.session_status = enrichment.status;
        payload.local_start_date = enrichment.localStartDate;
        payload.local_date = enrichment.localStartDate;
        payload.projection = enrichment.projection;
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
  return createHttpOutboxTransport({
    baseUrl: base,
    token:
      (typeof process !== 'undefined' &&
        process.env?.EXPO_PUBLIC_SYNC_API_TOKEN) ||
      undefined,
  });
}
