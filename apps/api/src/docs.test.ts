import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './index.ts';
import { MemoryIdempotencyStore, MemoryChangeFeed } from './idempotency.ts';
import { docsHtml } from './docs.ts';

describe('GET /api/docs', () => {
  it('serves an HTML page that points at the OpenAPI document', async () => {
    const app = createApp({
      store: new MemoryIdempotencyStore(),
      feed: new MemoryChangeFeed(),
      requireUuid: false,
    });
    const res = await app.request('/api/docs');
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type') ?? '', /text\/html/);
    const html = await res.text();
    assert.match(html, /swagger-ui/);
    assert.match(html, /\/api\/openapi\.json/);
  });

  it('docsHtml is deterministic and self-contained', () => {
    const a = docsHtml();
    const b = docsHtml();
    assert.equal(a, b);
    assert.ok(a.length > 500);
  });
});
