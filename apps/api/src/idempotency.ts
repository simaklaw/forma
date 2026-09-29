import type { OperationStatus } from '@forma/sync-contract';

export interface StoredOperation {
  client_operation_id: string;
  user_id: string;
  device_id: string;
  payload_hash: string;
  status: OperationStatus;
  result_body: Record<string, unknown>;
  /** Epoch ms when the entry was stored (for TTL eviction). */
  stored_at: number;
}

/** Default TTL for in-memory entries (24h). Postgres will replace this store. */
export const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * In-memory stand-in for platform.client_operation until Postgres is wired.
 * Key format: `${user_id}|${device_id}|${client_operation_id}`
 * Entries older than ttlMs are treated as missing (lazy eviction on get/put).
 */
export class MemoryIdempotencyStore {
  private readonly map = new Map<string, StoredOperation>();
  private readonly ttlMs: number;

  constructor(ttlMs: number = DEFAULT_TTL_MS) {
    this.ttlMs = ttlMs;
  }

  private key(userId: string, deviceId: string, clientOpId: string): string {
    return `${userId}|${deviceId}|${clientOpId}`;
  }

  private isExpired(entry: StoredOperation, now: number): boolean {
    return now - entry.stored_at > this.ttlMs;
  }

  /** Drop expired entries (lazy). Call periodically in long-running processes if needed. */
  sweep(now: number = Date.now()): number {
    let removed = 0;
    for (const [k, v] of this.map) {
      if (this.isExpired(v, now)) {
        this.map.delete(k);
        removed += 1;
      }
    }
    return removed;
  }

  get(
    userId: string,
    deviceId: string,
    clientOpId: string,
    now: number = Date.now(),
  ): StoredOperation | undefined {
    const k = this.key(userId, deviceId, clientOpId);
    const entry = this.map.get(k);
    if (!entry) return undefined;
    if (this.isExpired(entry, now)) {
      this.map.delete(k);
      return undefined;
    }
    return entry;
  }

  put(op: Omit<StoredOperation, 'stored_at'>, now: number = Date.now()): void {
    // Opportunistic sweep when map grows (keeps memory bounded without a timer).
    if (this.map.size > 10_000) {
      this.sweep(now);
    }
    this.map.set(this.key(op.user_id, op.device_id, op.client_operation_id), {
      ...op,
      stored_at: now,
    });
  }

  clear(): void {
    this.map.clear();
  }

  get size(): number {
    return this.map.size;
  }
}

export const defaultIdempotencyStore = new MemoryIdempotencyStore();
