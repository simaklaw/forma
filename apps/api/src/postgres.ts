import postgres from 'postgres';
import { randomUUID } from 'node:crypto';
import type { IdempotencyStore, StoredOperation, ChangeFeed } from './store.ts';
import type { SyncChange } from '@forma/sync-contract';

export type Sql = ReturnType<typeof postgres>;

export function createSql(connectionString: string): Sql {
  return postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });
}

/** Ensure app_user + device exist so client_operation FKs succeed (dev/bootstrap). */
async function ensureIdentity(
  sql: Sql,
  userId: string,
  deviceId: string,
): Promise<void> {
  await sql`
    INSERT INTO platform.app_user (user_id, auth_subject)
    VALUES (${userId}::uuid, ${userId})
    ON CONFLICT (user_id) DO NOTHING
  `;
  await sql`
    INSERT INTO platform.device (
      device_id, user_id, installation_id, platform, app_version
    )
    VALUES (
      ${deviceId}::uuid,
      ${userId}::uuid,
      ${deviceId}::uuid,
      'android',
      '0.0.0'
    )
    ON CONFLICT (device_id) DO NOTHING
  `;
}

export class PostgresIdempotencyStore implements IdempotencyStore {
  constructor(private readonly sql: Sql) {}

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

  async put(op: StoredOperation): Promise<void> {
    await ensureIdentity(this.sql, op.user_id, op.device_id);
    await this.sql`
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
        ${this.sql.json(op.result_body as postgres.JSONValue)}
      )
      ON CONFLICT (user_id, device_id, client_operation_id) DO NOTHING
    `;
  }
}

export class PostgresChangeFeed implements ChangeFeed {
  constructor(private readonly sql: Sql) {}

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
    await ensureIdentity(this.sql, input.user_id, input.user_id);
    const rows = await this.sql<{ change_id: string }[]>`
      INSERT INTO platform.sync_change (
        user_id, entity_type, entity_id, entity_version, mutation, payload
      ) VALUES (
        ${input.user_id}::uuid,
        ${input.entity_type},
        ${input.entity_id}::uuid,
        ${input.entity_version},
        ${input.mutation},
        ${this.sql.json(input.payload as postgres.JSONValue)}
      )
      RETURNING change_id
    `;
    return Number(rows[0].change_id);
  }
}
