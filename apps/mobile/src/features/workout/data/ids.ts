/** Lightweight client ids for P0. Prefer UUIDv7 when a platform crypto helper is wired. */

let seq = 0;

export function newClientId(prefix: string): string {
  seq += 1;
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${t}_${seq}_${r}`;
}

export function newOperationId(): string {
  return newClientId('op');
}

export function newEventId(): string {
  return newClientId('ev');
}

export function newSessionId(): string {
  return newClientId('sess');
}
