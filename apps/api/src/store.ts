import type { OperationStatus } from '@forma/sync-contract';
import type { SyncChange } from '@forma/sync-contract';

/** Row stored after a successful (or rejected) push operation. */
export interface StoredOperation {
  client_operation_id: string;
  user_id: string;
  device_id: string;
  aggregate_type: string;
  aggregate_id: string;
  payload_hash: string;
  status: OperationStatus;
  result_body: Record<string, unknown>;
}

/**
 * Idempotency store for POST /api/v1/sync/push.
 * Memory for tests; Postgres (platform.client_operation) in production.
 */
export interface IdempotencyStore {
  get(
    userId: string,
    deviceId: string,
    clientOpId: string,
  ): Promise<StoredOperation | undefined>;

  put(op: StoredOperation): Promise<void>;
}

/** Monotonic change feed for GET /api/v1/sync/pull. */
export interface ChangeFeed {
  listAfter(
    userId: string,
    afterChangeId: number,
    limit: number,
  ): Promise<{ changes: SyncChange[]; next_change_id: number; has_more: boolean }>;

  /** Append a change (used after accepted push). */
  append(input: {
    user_id: string;
    entity_type: string;
    entity_id: string;
    entity_version: number;
    mutation: 'upsert' | 'tombstone';
    payload: Record<string, unknown>;
  }): Promise<number>;
}
