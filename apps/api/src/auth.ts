/**
 * FitPulse P2 — per-user auth: deterministic user ids + HS256 JWTs.
 *
 * - subjectUserId: UUIDv5(auth_subject) — stable identity without a login
 *   provider; the same subject always maps to the same user_id.
 * - signJwt / verifyJwt: HS256 via node:crypto, no extra dependencies.
 * - UserRegistry: upserts platform.app_user under strict RLS (the insert
 *   runs with app.current_user_id already set to the derived user id).
 */

import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

/** RFC 4122 DNS namespace — fixed UUIDv5 namespace for auth subjects. */
const AUTH_NAMESPACE = '6ba7b811-9dad-11d1-80b4-00c04fd430c8';

/** Deterministic user_id for an auth_subject (UUIDv5, sha1). */
export function subjectUserId(authSubject: string): string {
  const ns = Buffer.from(AUTH_NAMESPACE.replace(/-/g, ''), 'hex');
  const digest = createHash('sha1').update(ns).update(authSubject, 'utf8').digest();
  digest[6] = (digest[6] & 0x0f) | 0x50; // version 5
  digest[8] = (digest[8] & 0x3f) | 0x80; // RFC 4122 variant
  const hex = digest.subarray(0, 16).toString('hex');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
}

/** Token lifetime: 30 days. */
export const JWT_TTL_SECONDS = 60 * 60 * 24 * 30;

function b64url(input: Buffer): string {
  return input.toString('base64url');
}

export function signJwt(
  secret: string,
  userId: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): string {
  const header = b64url(Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const payload = b64url(
    Buffer.from(
      JSON.stringify({ sub: userId, iat: nowSeconds, exp: nowSeconds + JWT_TTL_SECONDS }),
    ),
  );
  const data = `${header}.${payload}`;
  const sig = b64url(createHmac('sha256', secret).update(data).digest());
  return `${data}.${sig}`;
}

/** Returns the verified subject (user_id) or null. */
export function verifyJwt(
  secret: string,
  token: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): string | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const data = `${parts[0]}.${parts[1]}`;
  const expected = createHmac('sha256', secret).update(data).digest();
  let actual: Buffer;
  try {
    actual = Buffer.from(parts[2], 'base64url');
  } catch {
    return null;
  }
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return null;
  }
  let payload: { sub?: unknown; exp?: unknown };
  try {
    payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (typeof payload.sub !== 'string') return null;
  if (typeof payload.exp !== 'number' || payload.exp <= nowSeconds) return null;
  return payload.sub;
}

export interface RegisteredUser {
  user_id: string;
  created: boolean;
}

export interface UserRegistry {
  register(authSubject: string): Promise<RegisteredUser>;
}

/** In-memory registry (tests / non-Postgres deploys). */
export class MemoryUserRegistry implements UserRegistry {
  private readonly map = new Map<string, string>();

  async register(authSubject: string): Promise<RegisteredUser> {
    const existing = this.map.get(authSubject);
    if (existing) return { user_id: existing, created: false };
    const user_id = subjectUserId(authSubject);
    this.map.set(authSubject, user_id);
    return { user_id, created: true };
  }
}

/**
 * Postgres registry. Kept structural (sql: any) so auth.ts does not import
 * postgres.ts at module load (experimental-strip-types, circular risk).
 * The insert runs inside one transaction with app.current_user_id already
 * set to the derived user id — required by the strict RLS policy on
 * platform.app_user (no GUC => deny, and FORCE applies to the owner too).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SqlClient = any;

export class PostgresUserRegistry implements UserRegistry {
  private readonly sql: SqlClient;

  constructor(sql: SqlClient) {
    this.sql = sql;
  }

  async register(authSubject: string): Promise<RegisteredUser> {
    const userId = subjectUserId(authSubject);
    return this.sql.begin(async (tx: SqlClient) => {
      await tx`select set_config('app.current_user_id', ${userId}, true)`;
      const inserted = (await tx`
        INSERT INTO platform.app_user (user_id, auth_subject)
        VALUES (${userId}::uuid, ${authSubject})
        ON CONFLICT (auth_subject) DO NOTHING
        RETURNING user_id::text
      `) as { user_id: string }[];
      if (inserted.length > 0) {
        return { user_id: inserted[0].user_id, created: true };
      }
      const selected = (await tx`
        SELECT user_id::text FROM platform.app_user WHERE user_id = ${userId}::uuid
      `) as { user_id: string }[];
      if (selected.length === 0) {
        throw new Error('register_failed');
      }
      return { user_id: selected[0].user_id, created: false };
    });
  }
}
