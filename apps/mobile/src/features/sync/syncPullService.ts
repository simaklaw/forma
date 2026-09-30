/**
 * FitPulse P2 client pull — cursor-paged /api/v1/sync/pull consumer.
 *
 * - Cursor (next_change_id) is persisted in AsyncStorage; each session
 *   resumes where the previous one stopped.
 * - Pages until has_more is false; every page is applied BEFORE the
 *   cursor advances (at-least-once; appliers must be idempotent).
 * - Reuses ensureSyncCredentials: per-user JWT, auto re-register on
 *   expiry; no credentials → offline no-op.
 */

import { createLogger } from '@/core/logger';
import type { KeyValueStorage } from '../auth/syncAuth';
import { ensureSyncCredentials } from '../auth/syncAuth';

const log = createLogger('sync-pull');

export const PULL_CURSOR_KEY = 'fitpulse.sync.pull_cursor';

export interface PullChange {
  change_id: number;
  entity_type: string;
  entity_id: string;
  entity_version: number;
  mutation: string;
  payload: Record<string, unknown>;
}

export interface PullPage {
  changes: PullChange[];
  next_change_id: number;
  has_more: boolean;
}

/** Pluggable sink for pulled changes; return true when applied. */
export type ChangeApplier = {
  apply(change: PullChange): boolean;
};

export function isPullPage(value: unknown): value is PullPage {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    Array.isArray(v.changes) &&
    typeof v.next_change_id === 'number' &&
    Number.isFinite(v.next_change_id) &&
    typeof v.has_more === 'boolean'
  );
}

export type FetchPageOptions = {
  baseUrl: string;
  token: string;
  after: number;
  limit?: number;
  fetchImpl?: typeof fetch;
};

/**
 * GET /api/v1/sync/pull?after_change_id=<after>[&limit=].
 * user_id comes from the verified token subject on the server, so the
 * client never sends it (and cannot spoof it).
 */
export async function fetchPullPage(opts: FetchPageOptions): Promise<PullPage> {
  const base = opts.baseUrl.replace(/\/$/, '');
  const fetchFn = opts.fetchImpl ?? globalThis.fetch.bind(globalThis);
  let url = base + '/api/v1/sync/pull?after_change_id=' + encodeURIComponent(String(opts.after));
  if (opts.limit) url = url + '&limit=' + encodeURIComponent(String(opts.limit));
  const res = await fetchFn(url, {
    headers: {
      accept: 'application/json',
      authorization: 'Bearer ' + opts.token,
    },
  });
  if (!res.ok) {
    throw new Error('pull_failed_' + res.status);
  }
  const json: unknown = await res.json();
  if (!isPullPage(json)) {
    throw new Error('pull_invalid_response');
  }
  return json;
}

export async function loadCursor(storage: KeyValueStorage): Promise<number> {
  try {
    const raw = await storage.getItem(PULL_CURSOR_KEY);
    const n = raw == null ? 0 : Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

export async function saveCursor(storage: KeyValueStorage, cursor: number): Promise<void> {
  await storage.setItem(PULL_CURSOR_KEY, String(cursor));
}

export type PullServiceOptions = {
  baseUrl: string;
  storage: KeyValueStorage;
  applier: ChangeApplier;
  fetchImpl?: typeof fetch;
  /** Safety cap on pages per pull (500 changes/page => 50k changes). */
  maxPages?: number;
};

export type PullResult = {
  pages: number;
  applied: number;
  skipped: number;
  cursor: number;
  offline: boolean;
};

export class SyncPullService {
  private readonly opts: PullServiceOptions;

  constructor(opts: PullServiceOptions) {
    this.opts = opts;
  }

  /**
   * Pull all new changes and apply them. Never throws — network/auth
   * failures leave the cursor untouched and report offline:true.
   */
  async pullOnce(): Promise<PullResult> {
    const creds = await ensureSyncCredentials({
      baseUrl: this.opts.baseUrl,
      storage: this.opts.storage,
      fetchImpl: this.opts.fetchImpl,
    });
    if (!creds) {
      return { pages: 0, applied: 0, skipped: 0, cursor: 0, offline: true };
    }

    let after = await loadCursor(this.opts.storage);
    const startCursor = after;
    let pages = 0;
    let applied = 0;
    let skipped = 0;
    const maxPages = this.opts.maxPages ?? 100;

    try {
      for (;;) {
        const page = await fetchPullPage({
          baseUrl: this.opts.baseUrl,
          token: creds.token,
          after,
          fetchImpl: this.opts.fetchImpl,
        });
        pages += 1;
        for (const change of page.changes) {
          if (this.opts.applier.apply(change)) {
            applied += 1;
          } else {
            skipped += 1;
          }
        }
        after = page.next_change_id;
        await saveCursor(this.opts.storage, after);
        if (!page.has_more || pages >= maxPages) break;
      }
    } catch (err) {
      if (pages === 0) {
        // Nothing was fetched: fully offline for this attempt.
        return { pages: 0, applied: 0, skipped: 0, cursor: startCursor, offline: true };
      }
      // Partial progress kept (cursor advanced for applied pages).
      log.warn('pull interrupted; cursor kept', {
        err: err instanceof Error ? err.message : String(err),
        pages,
      });
    }

    if (applied + skipped > 0) {
      log.info('pull applied', { applied, skipped, pages, cursor: after });
    }
    return { pages, applied, skipped, cursor: after, offline: false };
  }
}
