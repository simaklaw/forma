/**
 * Nutrition product lookup — proxy to Open Food Facts with a TTL cache.
 *
 * Open Food Facts data is licensed under the Open Database License
 * (ODbL) — attribution required; the 'source' field on every product
 * carries it downstream. The API also asks consumers to identify with
 * a User-Agent and to cache product lookups — this service does both.
 *
 * Deliberately dependency-free: fetch is injectable so tests never
 * touch the network and React Native agents can plug their own.
 */
import { z } from 'zod';
import type { NutritionProductSummary } from '@forma/sync-contract';

export const OFF_BASE_URL = 'https://world.openfoodfacts.org';

const OFF_USER_AGENT =
  'forma-fitpulse/1.0 (https://github.com/simaklaw/forma)';

/** Path param for GET /api/v1/nutrition/product/:barcode. */
export const barcodeSchema = z
  .string()
  .regex(/^[0-9]{8,14}$/, 'barcode must be 8-14 digits (EAN/UPC)');

/** Default cache TTL: product records change slowly. */
export const NUTRITION_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
/** Remember "not found" for a shorter time before retrying upstream. */
const MISS_CACHE_TTL_MS = 60 * 60 * 1000;
/** Upstream request timeout. */
const OFF_TIMEOUT_MS = 5000;
/** Cache size cap (evicts the oldest entry). */
const MAX_CACHE_ENTRIES = 1000;

/** Subset of the OFF v0 product payload this API depends on. */
const offProductSchema = z.looseObject({
  product_name: z.string().optional(),
  generic_name: z.string().optional(),
  brands: z.string().optional(),
  quantity: z.string().optional(),
  ingredients_text: z.string().optional(),
  allergens_tags: z.array(z.string()).optional(),
  nutriscore_grade: z.string().optional(),
  nova_group: z.number().optional(),
  image_front_small_url: z.string().optional(),
  nutriments: z
    .looseObject({
      'energy-kcal_100g': z.number().optional(),
      proteins_100g: z.number().optional(),
      carbohydrates_100g: z.number().optional(),
      sugars_100g: z.number().optional(),
      'fat_100g': z.number().optional(),
      'saturated-fat_100g': z.number().optional(),
      salt_100g: z.number().optional(),
      fiber_100g: z.number().optional(),
    })
    .optional(),
});

const offResponseSchema = z.object({
  status: z.number(),
  product: offProductSchema.optional(),
});

/** Minimal structural fetch types (Node, tests and RN all fit). */
export interface OffFetchResponse {
  readonly ok: boolean;
  readonly status: number;
  json(): Promise<unknown>;
}

export type OffFetch = (
  url: string,
  init: { headers: Record<string, string>; signal?: AbortSignal },
) => Promise<OffFetchResponse>;

export interface NutritionServiceOptions {
  /** Injectable fetch (tests, agents). Defaults to globalThis.fetch. */
  fetch?: OffFetch;
  /** Override the upstream origin (tests). */
  baseUrl?: string;
  /** Override the found-product cache TTL (tests). */
  ttlMs?: number;
  /** Injectable clock for deterministic cache tests. */
  now?: () => number;
  /** Persistent cache backend (Postgres in production; Map by default). */
  store?: NutritionCacheStore;
}

export type NutritionLookupResult =
  | { status: 'found'; product: NutritionProductSummary }
  | { status: 'not_found' }
  | { status: 'unavailable' };

function globalFetch(): OffFetch {
  const fn = (globalThis as unknown as { fetch?: OffFetch }).fetch;
  if (!fn) {
    throw new Error('NutritionService: global fetch not available');
  }
  return fn;
}

function stringFrom(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/** One cache record: a found product, or null for a remembered miss. */
export interface NutritionCacheEntry {
  readonly expires: number;
  readonly product: NutritionProductSummary | null;
}

/**
 * Pluggable persistence for the TTL cache. Postgres-backed in
 * production (PostgresNutritionCacheStore); absent = in-memory Map.
 */
export interface NutritionCacheStore {
  get(barcode: string): Promise<NutritionCacheEntry | undefined>;
  set(barcode: string, entry: NutritionCacheEntry): Promise<void>;
}

export class NutritionService {
  private readonly doFetch: OffFetch;
  private readonly baseUrl: string;
  private readonly ttlMs: number;
  private readonly now: () => number;
  private readonly store: NutritionCacheStore | undefined;
  private readonly cache = new Map<string, NutritionCacheEntry>();

  constructor(options: NutritionServiceOptions = {}) {
    this.doFetch = options.fetch ?? globalFetch();
    this.baseUrl = options.baseUrl ?? OFF_BASE_URL;
    this.ttlMs = options.ttlMs ?? NUTRITION_CACHE_TTL_MS;
    this.now = options.now ?? (() => Date.now());
    this.store = options.store;
  }

  /**
   * Look up a product by barcode (already validated with barcodeSchema).
   * Found and not-found results are cached; upstream errors are not.
   */
  async lookup(barcode: string): Promise<NutritionLookupResult> {
    const hit = await this.readCache(barcode);
    if (hit && hit.expires > this.now()) {
      return hit.product
        ? { status: 'found', product: hit.product }
        : { status: 'not_found' };
    }

    let raw: unknown;
    try {
      const res = await this.doFetch(
        this.baseUrl + '/api/v0/product/' + barcode + '.json',
        {
          headers: {
            'user-agent': OFF_USER_AGENT,
            accept: 'application/json',
          },
          signal: AbortSignal.timeout(OFF_TIMEOUT_MS),
        },
      );
      if (!res.ok) {
        return { status: 'unavailable' };
      }
      raw = await res.json();
    } catch {
      return { status: 'unavailable' };
    }

    const parsed = offResponseSchema.safeParse(raw);
    if (!parsed.success || parsed.data.status === 0) {
      await this.rememberMiss(barcode);
      return { status: 'not_found' };
    }

    const p = parsed.data.product;
    const name = stringFrom(p?.product_name) ?? stringFrom(p?.generic_name);
    if (!name) {
      // OFF returns status 1 even for empty stub records; treat those
      // as not found so clients do not render nameless products.
      await this.rememberMiss(barcode);
      return { status: 'not_found' };
    }

    const n = p?.nutriments;
    const product: NutritionProductSummary = {
      barcode,
      name,
      brands: stringFrom(p?.brands),
      quantity: stringFrom(p?.quantity),
      ingredients_text: stringFrom(p?.ingredients_text),
      allergens_tags: p?.allergens_tags,
      nutriscore_grade: stringFrom(p?.nutriscore_grade),
      nova_group: typeof p?.nova_group === 'number' ? p.nova_group : undefined,
      image_url: stringFrom(p?.image_front_small_url),
      nutriments: n
        ? {
            energy_kcal_100g: n['energy-kcal_100g'],
            proteins_100g: n.proteins_100g,
            carbohydrates_100g: n.carbohydrates_100g,
            sugars_100g: n.sugars_100g,
            fat_100g: n['fat_100g'],
            saturated_fat_100g: n['saturated-fat_100g'],
            salt_100g: n.salt_100g,
            fiber_100g: n.fiber_100g,
          }
        : undefined,
      source: 'open-food-facts',
    };

    await this.writeCache(barcode, {
      expires: this.now() + this.ttlMs,
      product,
    });
    return { status: 'found', product };
  }

  private async rememberMiss(barcode: string): Promise<void> {
    await this.writeCache(barcode, {
      expires: this.now() + Math.min(this.ttlMs, MISS_CACHE_TTL_MS),
      product: null,
    });
  }

  /** Read through the persistent store when present, else the Map. */
  private async readCache(
    barcode: string,
  ): Promise<NutritionCacheEntry | undefined> {
    if (this.store) {
      try {
        return await this.store.get(barcode);
      } catch (err) {
        // A broken cache must never break lookups — degrade to a miss.
        console.error('[fitpulse-api] nutrition cache read failed', err);
        return undefined;
      }
    }
    return this.cache.get(barcode);
  }

  private async writeCache(
    barcode: string,
    entry: NutritionCacheEntry,
  ): Promise<void> {
    if (this.store) {
      try {
        await this.store.set(barcode, entry);
      } catch (err) {
        console.error('[fitpulse-api] nutrition cache write failed', err);
      }
      return;
    }
    this.cache.set(barcode, entry);
    if (this.cache.size > MAX_CACHE_ENTRIES) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) this.cache.delete(oldest);
    }
  }
}
