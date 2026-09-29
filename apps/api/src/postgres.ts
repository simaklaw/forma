import postgres from 'postgres';
import { randomUUID } from 'node:crypto';
import type {
  IdempotencyStore,
  StoredOperation,
  ChangeFeed,
  PutResult,
  SyncUnitOfWork,
  UnitOfWorkDeps,
} from './store.ts';
import { PostgresProjectionService } from './projections.ts';
import type { SyncChange } from '@forma/sync-contract';

export type Sql = ReturnType<typeof postgres>;

/**
 * Sql or transaction client. postgres.js TransactionSql is intentionally
 * NOT assignable to Sql in its own typings, so transaction-scoped stores
 * accept this looser structural type instead.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DbClient = any;

export function createSql(connectionString: string): Sql {
  return postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });
}

function asJson(sql: DbClient, value: Record<string, unknown>) {
  return sql.json(value as Parameters<Sql['json']>[0]);
}

/** Ensure app_user exists (FK for client_operation / sync_change). */
async function ensureUser(sql: DbClient, userId: string): Promise<void> {
  await sql`
    INSERT INTO platform.app_user (user_id, auth_subject)
    VALUES (${userId}::uuid, ${userId})
    ON CONFLICT (user_id) DO NOTHING
  `;
}

/**
 * Ensure device row exists (FK for client_operation).
 * Platform / app version are taken from client-reported op metadata
 * (StoredOperation.device_platform / app_version) with neutral defaults —
 * never hardcoded to a single OS.
 */
async function ensureDevice(
  sql: DbClient,
  userId: string,
  deviceId: string,
  platform: string = 'unknown',
  appVersion: string = '0.0.0',
): Promise<void> {
  await ensureUser(sql, userId);
  await sql`
    INSERT INTO platform.device (
      device_id, user_id, installation_id, platform, app_version
    )
    VALUES (
      ${deviceId}::uuid,
      ${userId}::uuid,
      ${deviceId}::uuid,
      ${platform},
      ${appVersion}
    )
    ON CONFLICT (device_id) DO NOTHING
  `;
}

export class PostgresIdempotencyStore implements IdempotencyStore {
  private readonly sql: DbClient;

  constructor(sql: DbClient) {
    this.sql = sql;
  }

  async get(
    userId: string,
    deviceId: string,
    clientOpId: string,
  ): Promise<StoredOperation | undefined> {
    const rows = await this.sql<
      {
        client_operation_id: string;
        user_id: string;
        device_id: string;
        aggregate_type: string;
        aggregate_id: string;
        payload_hash: string;
        status: StoredOperation['status'];
        result_body: Record<string, unknown>;
      }[]
    >`
      SELECT
        client_operation_id::text,
        user_id::text,
        device_id::text,
        aggregate_type,
        aggregate_id::text,
        payload_hash,
        status,
        result_body
      FROM platform.client_operation
      WHERE user_id = ${userId}::uuid
        AND device_id = ${deviceId}::uuid
        AND client_operation_id = ${clientOpId}::uuid
      LIMIT 1
    `;
    const row = rows[0];
    if (!row) return undefined;
    return {
      client_operation_id: row.client_operation_id,
      user_id: row.user_id,
      device_id: row.device_id,
      aggregate_type: row.aggregate_type,
      aggregate_id: row.aggregate_id,
      payload_hash: row.payload_hash,
      status: row.status,
      result_body: row.result_body ?? {},
    };
  }

  async put(op: StoredOperation): Promise<PutResult> {
    await ensureDevice(
      this.sql,
      op.user_id,
      op.device_id,
      op.device_platform,
      op.app_version,
    );
    const rows = await this.sql<{ operation_id: string }[]>`
      INSERT INTO platform.client_operation (
        operation_id,
        user_id,
        device_id,
        client_operation_id,
        aggregate_type,
        aggregate_id,
        payload_hash,
        status,
        result_body
      ) VALUES (
        ${randomUUID()}::uuid,
        ${op.user_id}::uuid,
        ${op.device_id}::uuid,
        ${op.client_operation_id}::uuid,
        ${op.aggregate_type},
        ${op.aggregate_id}::uuid,
        ${op.payload_hash},
        ${op.status}::platform.operation_status,
        ${asJson(this.sql, op.result_body)}
      )
      ON CONFLICT (user_id, device_id, client_operation_id) DO NOTHING
      RETURNING operation_id
    `;
    // inserted=false means another request won the race (or a replay):
    // the caller re-reads the stored row and answers duplicate/mismatch.
    return { inserted: rows.length > 0 };
  }
}

export class PostgresChangeFeed implements ChangeFeed {
  private readonly sql: DbClient;

  constructor(sql: DbClient) {
    this.sql = sql;
  }

  async listAfter(
    userId: string,
    afterChangeId: number,
    limit: number,
  ): Promise<{ changes: SyncChange[]; next_change_id: number; has_more: boolean }> {
    const rows = await this.sql<
      {
        change_id: string;
        entity_type: string;
        entity_id: string;
        entity_version: string;
        mutation: 'upsert' | 'tombstone';
        payload: Record<string, unknown>;
        committed_at: Date;
      }[]
    >`
      SELECT
        change_id,
        entity_type,
        entity_id::text,
        entity_version,
        mutation,
        payload,
        committed_at
      FROM platform.sync_change
      WHERE user_id = ${userId}::uuid
        AND change_id > ${afterChangeId}
      ORDER BY change_id ASC
      LIMIT ${limit + 1}
    `;

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const changes: SyncChange[] = page.map((r) => ({
      change_id: Number(r.change_id),
      entity_type: r.entity_type,
      entity_id: r.entity_id,
      entity_version: Number(r.entity_version),
      mutation: r.mutation,
      payload: r.payload ?? {},
      committed_at: new Date(r.committed_at).toISOString(),
    }));
    const next =
      changes.length > 0
        ? changes[changes.length - 1].change_id
        : afterChangeId;
    return { changes, next_change_id: next, has_more: hasMore };
  }

  async append(input: {
    user_id: string;
    entity_type: string;
    entity_id: string;
    entity_version: number;
    mutation: 'upsert' | 'tombstone';
    payload: Record<string, unknown>;
  }): Promise<number> {
    await ensureUser(this.sql, input.user_id);
    const rows = await this.sql<{ change_id: string }[]>`
      INSERT INTO platform.sync_change (
        user_id, entity_type, entity_id, entity_version, mutation, payload
      ) VALUES (
        ${input.user_id}::uuid,
        ${input.entity_type},
        ${input.entity_id}::uuid,
        ${input.entity_version},
        ${input.mutation},
        ${asJson(this.sql, input.payload)}
      )
      RETURNING change_id
    `;
    return Number(rows[0].change_id);
  }
}

/**
 * Postgres unit of work: every push/pull runs inside ONE transaction that
 * also sets app.current_user_id (transaction-local GUC) so strict RLS
 * policies scope all reads/writes to the requesting user.
 * Store, feed and projections share the transaction client — an accepted
 * operation, its change-feed entry and its projections commit atomically.
 */
export class PostgresSyncUnitOfWork implements SyncUnitOfWork {
  private readonly sql: Sql;

  constructor(sql: Sql) {
    this.sql = sql;
  }

  async run<T>(userId: string, fn: (deps: UnitOfWorkDeps) => Promise<T>): Promise<T> {
    // postgres.js begin() typings do not propagate our generic cleanly
    // (UnwrapPromiseArray overload is picked instead) — call it through a
    // narrow, explicit signature.
    const begin = this.sql.begin as unknown as (
      cb: (tx: DbClient) => Promise<T>,
    ) => Promise<T>;
    return begin(async (tx) => {
      // true = transaction-local (like SET LOCAL), cleared on commit/rollback
      await tx`SELECT set_config('app.current_user_id', ${userId}, true)`;
      return fn({
        store: new PostgresIdempotencyStore(tx),
        feed: new PostgresChangeFeed(tx),
        projections: new PostgresProjectionService(tx),
      });
    });
  }
}
