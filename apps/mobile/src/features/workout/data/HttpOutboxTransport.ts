import type { OutboxRow } from './SessionRepository';
import type { OutboxTransport } from './OutboxDrainService';
import { LOCAL_USER_ID } from '../session/currentUser';

/**
 * Until real auth, map the local placeholder user to a fixed UUID so
 * Postgres FK / requireUuid paths accept the payload.
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

export type HttpOutboxTransportOptions = {
  baseUrl: string;
  /**
   * Shared-secret token for the sync API (SYNC_API_TOKEN on the server).
   * Sent as Authorization: Bearer <token>. When the server has the token
   * set, requests without it get 401 and every send() fails.
   */
  token?: string;
  /** Defaults to SYNC_LOCAL_DEVICE_UUID. */
  deviceId?: string;
  /** Defaults to resolveSyncUserId(). */
  userId?: string;
  fetchImpl?: typeof fetch;
};

/**
 * Pushes one outbox row to FitPulse sync API (POST /api/v1/sync/push).
 * Network errors → 'failed' (row stays retryable after mark failed).
 */
export function createHttpOutboxTransport(
  opts: HttpOutboxTransportOptions,
): OutboxTransport {
  const base = opts.baseUrl.replace(/\/$/, '');
  const deviceId = opts.deviceId ?? SYNC_LOCAL_DEVICE_UUID;
  const userId = opts.userId ?? resolveSyncUserId();
  const token = opts.token;
  const fetchFn = opts.fetchImpl ?? globalThis.fetch.bind(globalThis);

  return {
    async send(row: OutboxRow): Promise<'accepted' | 'failed'> {
      const headers: Record<string, string> = {
        'content-type': 'application/json',
        accept: 'application/json',
      };
      if (token) headers.authorization = `Bearer ${token}`;

      const payload = {
        event_id: row.eventId,
        aggregate_version: row.aggregateVersion,
        ...(row.projection ? { projection: row.projection } : {}),
      };

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
 * EXPO_PUBLIC_SYNC_API_URL=http://10.0.2.2:8787
 * EXPO_PUBLIC_SYNC_API_TOKEN=<same value as server SYNC_API_TOKEN>
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
