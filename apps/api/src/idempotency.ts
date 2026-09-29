import type { OperationStatus } from '@forma/sync-contract';

export interface StoredOperation {
  client_operation_id: string;
  user_id: string;
  device_id: string;
  payload_hash: string;
  status: OperationStatus;
  result_body: Record<string, unknown>;
}

/**
 * In-memory stand-in for platform.client_operation until Postgres is wired.
 * Key: `${user_id}\0${device_id}\0${client_operation_id}`
 */
export class MemoryIdempotencyStore {
  private readonly map = new Map<string, StoredOperation>();

  private key(userId: string, deviceId: string, clientOpId: string): string {
    return `${userId}\0${deviceId}\0${clientOpId}`;
  }

  get(
    userId: string,
    deviceId: string,
    clientOpId: string,
  ): StoredOperation | undefined {
    return this.map.get(this.key(userId, deviceId, clientOpId));
  }

  put(op: StoredOperation): void {
    this.map.set(
      this.key(op.user_id, op.device_id, op.client_operation_id),
      op,
    );
  }

  clear(): void {
    this.map.clear();
  }
}

export const defaultIdempotencyStore = new MemoryIdempotencyStore();
