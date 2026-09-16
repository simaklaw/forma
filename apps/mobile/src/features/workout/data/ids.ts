/**
 * Client-side UUIDv7 (RFC 9562 §5.7).
 * Sortable by creation time; safe for session_id / event_id / operation_id.
 *
 * Layout (128-bit):
 *   48-bit unix_ts_ms | 4-bit ver=7 | 12-bit rand_a | 2-bit var=10 | 62-bit rand_b
 */

function randomBytes(n: number): Uint8Array {
  const out = new Uint8Array(n);
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(out);
    return out;
  }
  for (let i = 0; i < n; i++) out[i] = Math.floor(Math.random() * 256);
  return out;
}

function toHex(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) {
    s += bytes[i]!.toString(16).padStart(2, '0');
  }
  return s;
}

/**
 * @param nowMs - injectable clock for tests (default Date.now)
 * @param rand - injectable 10 random bytes for tests
 */
export function uuidv7(nowMs: number = Date.now(), rand?: Uint8Array): string {
  const r = rand && rand.length >= 10 ? rand : randomBytes(10);
  const bytes = new Uint8Array(16);

  // 48-bit big-endian timestamp
  const ts = BigInt(nowMs);
  bytes[0] = Number((ts >> 40n) & 0xffn);
  bytes[1] = Number((ts >> 32n) & 0xffn);
  bytes[2] = Number((ts >> 24n) & 0xffn);
  bytes[3] = Number((ts >> 16n) & 0xffn);
  bytes[4] = Number((ts >> 8n) & 0xffn);
  bytes[5] = Number(ts & 0xffn);

  // version 7 + 12 bits rand_a
  bytes[6] = 0x70 | (r[0]! & 0x0f);
  bytes[7] = r[1]!;

  // variant 10xxxxxx + rand_b
  bytes[8] = 0x80 | (r[2]! & 0x3f);
  bytes[9] = r[3]!;
  bytes[10] = r[4]!;
  bytes[11] = r[5]!;
  bytes[12] = r[6]!;
  bytes[13] = r[7]!;
  bytes[14] = r[8]!;
  bytes[15] = r[9]!;

  const h = toHex(bytes);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export function newOperationId(nowMs?: number): string {
  return uuidv7(nowMs);
}

export function newEventId(nowMs?: number): string {
  return uuidv7(nowMs);
}

export function newSessionId(nowMs?: number): string {
  return uuidv7(nowMs);
}

/** @deprecated use uuidv7 */
export function newClientId(_prefix: string): string {
  return uuidv7();
}
