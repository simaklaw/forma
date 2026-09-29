/** FitPulse P1 sync contract — push/pull DTOs (architecture plan §4). */

export type OperationStatus = 'accepted' | 'duplicate' | 'rejected';

export type SyncMutation = 'upsert' | 'tombstone';

/** One client→server operation (Transactional Outbox row). */
export interface SyncPushOperation {
  /** UUIDv7 preferred; unique per device for idempotency. */
  client_operation_id: string;
  device_id: string;
  aggregate_type: string;
  aggregate_id: string;
  /** SHA-256 hex of canonical payload JSON. */
  payload_hash: string;
  payload: Record<string, unknown>;
  occurred_at_client: string;
}

export interface SyncPushRequest {
  user_id: string;
  operations: SyncPushOperation[];
}

export interface SyncPushOperationResult {
  client_operation_id: string;
  status: OperationStatus;
  result_body?: Record<string, unknown>;
  error_code?: string;
  error_message?: string;
}

export interface SyncPushResponse {
  results: SyncPushOperationResult[];
}

export interface SyncChange {
  change_id: number;
  entity_type: string;
  entity_id: string;
  entity_version: number;
  mutation: SyncMutation;
  payload: Record<string, unknown>;
  committed_at: string;
}

export interface SyncPullRequest {
  user_id: string;
  after_change_id: number;
  limit?: number;
}

export interface SyncPullResponse {
  changes: SyncChange[];
  /** Highest change_id in this page; client advances cursor to this. */
  next_change_id: number;
  has_more: boolean;
}
