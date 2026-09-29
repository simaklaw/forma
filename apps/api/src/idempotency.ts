import type {
  IdempotencyStore,
  StoredOperation,
  ChangeFeed,
  PutResult,
  SyncUnitOfWork,
  UnitOfWorkDeps,
} from './store.ts';
import type { ProjectionService } from './projections.ts';
import type { SyncChange } from '@forma/sync-contract';

/** Default TTL for in-memory entries (24h). */
export const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

interface MemoryEntry extends StoredOperation {
  stored_at: number;
}

/**
 * In-memory IdempotencyStore (tests + local without DATABASE_URL).
 * Key: `${user_id}|${device_id}|${client_operation_id}`
 */
export class MemoryIdempotencyStore implements IdempotencyStore {
  private readonly map = new Map<string, MemoryEntry>();
  private readonly ttlMs: number;

  constructor(ttlMs: number = DEFAULT_TTL_MS) {
    this.ttlMs = ttlMs;
  }

  private key(userId: string, deviceId: string, clientOpId: string): string {
    return `${userId}|${deviceId}|${clientOpId}`;
  }

  private isExpired(entry: MemoryEntry, now: number): boolean {
    return now - entry.stored_at > this.ttlMs;
  }

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

  async get(
    userId: string,
    deviceId: string,
    clientOpId: string,
  ): Promise<StoredOperation | undefined> {
    const now = Date.now();
    const k = this.key(userId, deviceId, clientOpId);
    const entry = this.map.get(k);
    if (!entry) return undefined;
    if (this.isExpired(entry, now)) {
      this.map.delete(k);
      return undefined;
    }
    const { stored_at: _, ...rest } = entry;
    return rest;
  }

  async put(op: StoredOperation): Promise<PutResult> {
    const now = Date.now();
    if (this.map.size > 10_000) this.sweep(now);
    const k = this.key(op.user_id, op.device_id, op.client_operation_id);
    const inserted = !this.map.has(k);
    this.map.set(k, { ...op, stored_at: now });
    return { inserted };
  }

  clear(): void {
    this.map.clear();
  }

  get size(): number {
    return this.map.size;
  }
}

/** In-memory change feed (tests). */
export class MemoryChangeFeed implements ChangeFeed {
  private seq = 0;
  private readonly rows: Array<SyncChange & { user_id: string }> = [];

  async listAfter(
    userId: string,
    afterChangeId: number,
    limit: number,
  ): Promise<{ changes: SyncChange[]; next_change_id: number; has_more: boolean }> {
    const matched = this.rows.filter(
      (r) => r.user_id === userId && r.change_id > afterChangeId,
    );
    const page = matched.slice(0, limit);
    const next =
      page.length > 0 ? page[page.length - 1].change_id : afterChangeId;
    return {
      changes: page.map(({ user_id: _, ...c }) => c),
      next_change_id: next,
      has_more: matched.length > limit,
    };
  }

  async append(input: {
    user_id: string;
    entity_type: string;
    entity_id: string;
    entity_version: number;
    mutation: 'upsert' | 'tombstone';
    payload: Record<string, unknown>;
  }): Promise<number> {
    this.seq += 1;
    this.rows.push({
      change_id: this.seq,
      user_id: input.user_id,
      entity_type: input.entity_type,
      entity_id: input.entity_id,
      entity_version: input.entity_version,
      mutation: input.mutation,
      payload: input.payload,
      committed_at: new Date().toISOString(),
    });
    return this.seq;
  }
}

/**
 * Memory unit of work: no real transaction, straight pass-through.
 * Keeps the same shape as PostgresSyncUnitOfWork for the API layer.
 */
export class MemorySyncUnitOfWork implements SyncUnitOfWork {
  private readonly store: IdempotencyStore;
  private readonly feed: ChangeFeed;
  private readonly projections: ProjectionService;

  constructor(
    store: IdempotencyStore,
    feed: ChangeFeed,
    projections: ProjectionService,
  ) {
    this.store = store;
    this.feed = feed;
    this.projections = projections;
  }

  async run<T>(userId: string, fn: (deps: UnitOfWorkDeps) => Promise<T>): Promise<T> {
    return fn({
      store: this.store,
      feed: this.feed,
      projections: this.projections,
    });
  }
}

export const defaultIdempotencyStore = new MemoryIdempotencyStore();
export const defaultChangeFeed = new MemoryChangeFeed();
