import type { OperationStatus, SyncChange } from '@forma/sync-contract';
import type { ProjectionService } from './projections.ts';

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
  /** Optional client-reported device metadata (never hardcoded server-side). */
  device_platform?: string;
  app_version?: string;
}

/** Result of IdempotencyStore.put: false when the row already existed (race / replay). */
export interface PutResult {
  inserted: boolean;
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

  put(op: StoredOperation): Promise<PutResult>;
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

/**
 * Per-entity version head for optimistic concurrency
 * (platform.entity_head; MemoryEntityVersionStore in tests).
 */
export interface EntityVersionStore {
  /**
   * Atomically bump the entity version.
   * - expected_version undefined: unconditional bump (last-write-wins).
   * - expected_version 0: entity must not exist yet; create at version 1.
   * - expected_version N: bump only when the current version is N.
   * On mismatch returns ok=false with the actual current_version
   * (0 when the entity does not exist).
   */
  bump(input: {
    user_id: string;
    entity_type: string;
    entity_id: string;
    expected_version?: number;
  }): Promise<
    | { ok: true; new_version: number }
    | { ok: false; current_version: number }
  >;
}

/** Transaction-scoped dependencies handed to a unit of work. */
export interface UnitOfWorkDeps {
  store: IdempotencyStore;
  feed: ChangeFeed;
  projections: ProjectionService;
  versions: EntityVersionStore;
}

/**
 * Unit of work: runs store + feed + projections atomically for one user.
 * Memory implementation is a plain pass-through; Postgres wraps in a
 * transaction and sets app.current_user_id (RLS GUC) for its duration.
 */
export interface SyncUnitOfWork {
  run<T>(userId: string, fn: (deps: UnitOfWorkDeps) => Promise<T>): Promise<T>;
}
