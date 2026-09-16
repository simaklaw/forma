/** Client UUIDv7 for web session / event / operation ids. */

function randomBytes(n: number): Uint8Array {
  const out = new Uint8Array(n);
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(out);
    return out;
  }
  for (let i = 0; i < n; i++) out[i] = Math.floor(Math.random() * 256);
  return out;
}

function toHex(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) {
    s += bytes[i]!.toString(16).padStart(2, "0");
  }
  return s;
}

export function uuidv7(nowMs: number = Date.now(), rand?: Uint8Array): string {
  const r = rand && rand.length >= 10 ? rand : randomBytes(10);
  const bytes = new Uint8Array(16);
  const ts = BigInt(nowMs);
  bytes[0] = Number((ts >> 40n) & 0xffn);
  bytes[1] = Number((ts >> 32n) & 0xffn);
  bytes[2] = Number((ts >> 24n) & 0xffn);
  bytes[3] = Number((ts >> 16n) & 0xffn);
  bytes[4] = Number((ts >> 8n) & 0xffn);
  bytes[5] = Number(ts & 0xffn);
  bytes[6] = 0x70 | (r[0]! & 0x0f);
  bytes[7] = r[1]!;
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
