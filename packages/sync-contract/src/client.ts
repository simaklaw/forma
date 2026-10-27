/**
 * Typed sync API client shared by web and mobile.
 *
 * Completes the FastAPI-style loop started by apps/api: the same
 * contract types in types.ts shape the OpenAPI document
 * (apps/api openapi.ts), validate requests (apps/api validation.ts)
 * and type this client — one source of truth for the whole API.
 *
 * Deliberately dependency-free: fetch is injected (or picked up from
 * globalThis), so the same client works in Node, browsers and React Native.
 */
import type {
  SyncPushRequest,
  SyncPushResponse,
  SyncPullResponse,
  NutritionProductSummary,
} from './types.ts';

/** Minimal structural subset of a fetch Response used by the client. */
export interface SyncFetchResponse {
  readonly ok: boolean;
  readonly status: number;
  text(): Promise<string>;
}

export type SyncFetch = (
  url: string,
  init: {
    method: 'GET' | 'POST';
    headers: Record<string, string>;
    body?: string;
  },
) => Promise<SyncFetchResponse>;

export interface SyncClientOptions {
  /** API origin, e.g. https://api.example.com (trailing slash is ok). */
  baseUrl: string;
  /** Bearer token: app JWT (jwt auth mode) or SYNC_API_TOKEN. */
  token?: string;
  /** Injectable fetch implementation (tests, React Native, agents). */
  fetch?: SyncFetch;
}

export interface SyncPullParams {
  /** Optional with JWT auth — defaults to the token subject server-side. */
  user_id?: string;
  /** Cursor: return changes with change_id strictly greater than this. */
  after_change_id: number;
  limit?: number;
}

export interface SyncClient {
  /** Push a batch of client operations; returns per-operation results. */
  push(request: SyncPushRequest): Promise<SyncPushResponse>;
  /** Pull one page of changes after a cursor. */
  pull(params: SyncPullParams): Promise<SyncPullResponse>;
  /** Look up a packaged product by barcode (Open Food Facts proxy). */
  nutritionProduct(barcode: string): Promise<NutritionProductSummary>;
}

/** HTTP-level error from the sync API; body carries code/message/issues. */
export class SyncApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, body: unknown) {
    super('Sync API responded with ' + String(status));
    this.name = 'SyncApiError';
    this.status = status;
    this.body = body;
  }
}

function globalFetch(): SyncFetch {
  const fn = (globalThis as unknown as { fetch?: SyncFetch }).fetch;
  if (!fn) {
    throw new Error(
      'createSyncClient: global fetch not found — pass the fetch option',
    );
  }
  return fn;
}

function parseBody(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export function createSyncClient(options: SyncClientOptions): SyncClient {
  const baseUrl = options.baseUrl.replace(/\/+$/, '');
  const headers: Record<string, string> = {
    'content-type': 'application/json',
  };
  if (options.token) {
    headers.authorization = 'Bearer ' + options.token;
  }
  const fetch = options.fetch ?? globalFetch();

  const request = async (
    method: 'GET' | 'POST',
    url: string,
    body?: string,
  ): Promise<unknown> => {
    const res = await fetch(url, { method, headers, body });
    const text = await res.text();
    if (!res.ok) {
      throw new SyncApiError(res.status, parseBody(text));
    }
    return parseBody(text);
  };

  return {
    async push(pushRequest: SyncPushRequest): Promise<SyncPushResponse> {
      return (await request(
        'POST',
        baseUrl + '/api/v1/sync/push',
        JSON.stringify(pushRequest),
      )) as SyncPushResponse;
    },

    async pull(params: SyncPullParams): Promise<SyncPullResponse> {
      const query = [
        params.user_id !== undefined
          ? 'user_id=' + encodeURIComponent(params.user_id)
          : null,
        'after_change_id=' + params.after_change_id,
        params.limit !== undefined ? 'limit=' + params.limit : null,
      ]
        .filter((part): part is string => part !== null)
        .join('&');
      return (await request(
        'GET',
        baseUrl + '/api/v1/sync/pull?' + query,
      )) as SyncPullResponse;
    },

    async nutritionProduct(
      barcode: string,
    ): Promise<NutritionProductSummary> {
      return (await request(
        'GET',
        baseUrl + '/api/v1/nutrition/product/' + encodeURIComponent(barcode),
      )) as NutritionProductSummary;
    },
  };
}
