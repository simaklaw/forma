import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildOpenApiDocument } from './openapi.ts';

type JsonRecord = { [key: string]: JsonRecord };

describe('OpenAPI document', () => {
  it('is JSON-serializable and describes every endpoint', () => {
    const doc = buildOpenApiDocument() as unknown as JsonRecord;
    const json = JSON.stringify(doc);
    assert.ok(json.length > 0);
    assert.equal(doc.openapi, '3.1.0');
    const paths = Object.keys(doc.paths);
    for (const p of [
      '/health',
      '/api/v1/auth/register',
      '/api/v1/auth/oidc',
      '/api/v1/sync/push',
      '/api/v1/sync/pull',
    ]) {
      assert.ok(paths.includes(p), 'missing path ' + p);
    }
  });

  it('push request body references the SyncPushOperation schema', () => {
    const doc = buildOpenApiDocument() as unknown as JsonRecord;
    const body =
      doc.paths['/api/v1/sync/push'].post.requestBody.content[
        'application/json'
      ].schema;
    assert.equal(
      body.properties.operations.items.$ref,
      '#/components/schemas/SyncPushOperation',
    );
    const op = doc.components.schemas.SyncPushOperation;
    assert.equal(op.type, 'object');
    assert.ok(op.properties.payload_hash);
    assert.ok(op.properties.expected_version, 'expected_version documented');
  });

  it('documents bearer security and the validation error response', () => {
    const doc = buildOpenApiDocument() as unknown as JsonRecord;
    assert.ok(doc.components.securitySchemes.bearerJwt);
    assert.ok(doc.components.responses.ValidationError);
    assert.ok(doc.components.schemas.ValidationResponseBody);
  });
});
