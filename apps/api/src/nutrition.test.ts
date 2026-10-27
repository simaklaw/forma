import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './index.ts';
import { MemoryIdempotencyStore, MemoryChangeFeed } from './idempotency.ts';
import { NutritionService } from './nutrition.ts';
import { buildOpenApiDocument } from './openapi.ts';

interface OffCall {
  url: string;
  headers: Record<string, string>;
}

function stubOff(status: number, bodyText: string) {
  const calls: OffCall[] = [];
  const fetch = async (url: string, init: any) => {
    calls.push({ url, headers: init.headers });
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => JSON.parse(bodyText),
    };
  };
  return { calls, fetch };
}

const BARCODE = '4680036910028';

const foundBody = JSON.stringify({
  status: 1,
  product: {
    product_name: 'Гречка ядрица',
    brands: 'Мистраль',
    quantity: '400 г',
    ingredients_text: 'крупа гречневая ядрица',
    allergens_tags: ['en:gluten'],
    nutriscore_grade: 'a',
    nova_group: 1,
    image_front_small_url: 'https://images.openfoodfacts.org/front.jpg',
    nutriments: {
      'energy-kcal_100g': 343,
      proteins_100g: 12.6,
      carbohydrates_100g: 68,
      sugars_100g: 1.4,
      'fat_100g': 2.6,
      'saturated-fat_100g': 0.6,
      salt_100g: 0.01,
      fiber_100g: 10,
    },
  },
});

function makeApp(stub: ReturnType<typeof stubOff>, now?: () => number) {
  return createApp({
    store: new MemoryIdempotencyStore(),
    feed: new MemoryChangeFeed(),
    nutrition: new NutritionService({ fetch: stub.fetch as any, now }),
  });
}

describe('GET /api/v1/nutrition/product/:barcode', () => {
  it('rejects invalid barcodes with 400 + issues', async () => {
    const stub = stubOff(200, foundBody);
    const app = makeApp(stub);
    const res = await app.request('/api/v1/nutrition/product/abc');
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error, 'invalid_barcode');
    assert.ok(Array.isArray(body.issues));
    assert.equal(stub.calls.length, 0);
  });

  it('returns a mapped product and identifies itself to OFF', async () => {
    const stub = stubOff(200, foundBody);
    const app = makeApp(stub);
    const res = await app.request('/api/v1/nutrition/product/' + BARCODE);
    assert.equal(res.status, 200);
    const product = await res.json();
    assert.equal(product.name, 'Гречка ядрица');
    assert.equal(product.source, 'open-food-facts');
    assert.equal(product.nutriments.energy_kcal_100g, 343);
    assert.equal(product.nutriments.proteins_100g, 12.6);
    assert.equal(product.nutriscore_grade, 'a');
    assert.ok(
      stub.calls[0].url.includes('/api/v0/product/' + BARCODE + '.json'),
    );
    assert.match(stub.calls[0].headers['user-agent'], /forma-fitpulse/);
  });

  it('caches found products for repeat lookups', async () => {
    const stub = stubOff(200, foundBody);
    const app = makeApp(stub);
    await app.request('/api/v1/nutrition/product/' + BARCODE);
    await app.request('/api/v1/nutrition/product/' + BARCODE);
    assert.equal(stub.calls.length, 1);
  });

  it('returns 404 for unknown barcodes and caches the miss', async () => {
    const stub = stubOff(200, JSON.stringify({ status: 0 }));
    const app = makeApp(stub);
    const res = await app.request('/api/v1/nutrition/product/0000000000000');
    assert.equal(res.status, 404);
    assert.equal((await res.json()).error, 'product_not_found');
    await app.request('/api/v1/nutrition/product/0000000000000');
    assert.equal(stub.calls.length, 1);
  });

  it('returns 502 when OFF is unavailable and does not cache it', async () => {
    const stub = stubOff(503, 'unavailable');
    const app = makeApp(stub);
    const res = await app.request('/api/v1/nutrition/product/' + BARCODE);
    assert.equal(res.status, 502);
    assert.equal((await res.json()).error, 'nutrition_unavailable');
    await app.request('/api/v1/nutrition/product/' + BARCODE);
    assert.equal(stub.calls.length, 2);
  });

  it('re-fetches after the cache TTL expires', async () => {
    let clock = 1_000_000;
    const stub = stubOff(200, foundBody);
    const app = createApp({
      store: new MemoryIdempotencyStore(),
      feed: new MemoryChangeFeed(),
      nutrition: new NutritionService({
        fetch: stub.fetch as any,
        ttlMs: 1_000,
        now: () => clock,
      }),
    });
    await app.request('/api/v1/nutrition/product/' + BARCODE);
    clock += 500;
    await app.request('/api/v1/nutrition/product/' + BARCODE);
    assert.equal(stub.calls.length, 1);
    clock += 2_000;
    await app.request('/api/v1/nutrition/product/' + BARCODE);
    assert.equal(stub.calls.length, 2);
  });

  it('is documented in the OpenAPI document', () => {
    const doc = buildOpenApiDocument() as Record<string, any>;
    assert.ok(doc.paths['/api/v1/nutrition/product/{barcode}']);
    assert.ok(doc.tags.some((t: any) => t.name === 'nutrition'));
  });
});
