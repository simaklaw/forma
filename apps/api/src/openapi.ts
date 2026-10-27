/**
 * OpenAPI 3.1 document for the FitPulse sync API, generated from the
 * same zod schemas that validate requests at runtime.
 *
 * Served at GET /api/openapi.json — open it in any Swagger UI / Redoc /
 * Postman, or use it to generate client types later.
 *
 * Endpoint availability depends on environment configuration
 * (JWT_SECRET / OIDC client env); the document describes the full API.
 */
import { z } from 'zod';
import {
  authRegisterSchema,
  oidcAuthSchema,
  syncPushOperationSchema,
} from './validation.ts';

const validationErrorSchema = {
  type: 'object',
  required: ['error', 'message', 'issues'],
  properties: {
    error: { type: 'string' },
    message: { type: 'string' },
    issues: {
      type: 'array',
      items: {
        type: 'object',
        required: ['path', 'code', 'message'],
        properties: {
          path: { type: 'string', description: 'Dot-separated field path' },
          code: { type: 'string' },
          message: { type: 'string' },
        },
      },
    },
  },
} as const;

function jsonContent(schema: unknown) {
  return { 'application/json': { schema } };
}

export function buildOpenApiDocument(): Record<string, unknown> {
  const pushRequestSchema = {
    type: 'object',
    required: ['user_id', 'operations'],
    properties: {
      user_id: { type: 'string', minLength: 1 },
      operations: {
        type: 'array',
        items: { $ref: '#/components/schemas/SyncPushOperation' },
        description:
          'Operations are validated individually: a bad operation is rejected per-item, not the whole batch.',
      },
    },
  };

  return {
    openapi: '3.1.0',
    info: {
      title: 'FitPulse Sync API',
      version: '1.0.0',
      description:
        'Sync API for the FORMA (FitPulse) fitness app.\n\nAuth endpoints are available when JWT_SECRET (and OIDC client env) are configured; /api/v1/sync/* requires a Bearer token in that case. Validation failures return HTTP 400 with a machine-readable issues array.',
    },
    servers: [{ url: '/' }],
    tags: [
      { name: 'health', description: 'Liveness and configuration probe' },
      { name: 'auth', description: 'Registration and OIDC login' },
      { name: 'sync', description: 'Idempotent operation sync' },
    ],
    paths: {
      '/health': {
        get: {
          tags: ['health'],
          summary: 'Liveness probe + active auth mode',
          responses: {
            '200': {
              description: 'Service is up',
              content: jsonContent({
                type: 'object',
                required: ['ok', 'service', 'store', 'auth'],
                properties: {
                  ok: { type: 'boolean' },
                  service: { type: 'string' },
                  store: { type: 'string', enum: ['postgres', 'memory'] },
                  auth: { type: 'string', enum: ['jwt', 'bearer', 'open'] },
                },
              }),
            },
          },
        },
      },
      '/api/v1/auth/register': {
        post: {
          tags: ['auth'],
          summary: 'Register (or re-login) by auth subject, returns a JWT',
          requestBody: {
            required: true,
            content: jsonContent(z.toJSONSchema(authRegisterSchema)),
          },
          responses: {
            '200': {
              description: 'Registered / existing user',
              content: jsonContent({
                type: 'object',
                properties: {
                  user_id: { type: 'string' },
                  created: { type: 'boolean' },
                  token: { type: 'string' },
                  expires_at: { type: 'string', format: 'date-time' },
                },
              }),
            },
            '400': { $ref: '#/components/responses/ValidationError' },
          },
        },
      },
      '/api/v1/auth/oidc': {
        post: {
          tags: ['auth'],
          summary:
            'Exchange a Mail.ru / VK ID token (or auth code + PKCE) for an app JWT',
          requestBody: {
            required: true,
            content: jsonContent(z.toJSONSchema(oidcAuthSchema)),
          },
          responses: {
            '200': {
              description: 'Authenticated',
              content: jsonContent({
                type: 'object',
                properties: {
                  user_id: { type: 'string' },
                  created: { type: 'boolean' },
                  token: { type: 'string' },
                  expires_at: { type: 'string', format: 'date-time' },
                  auth_subject: { type: 'string' },
                  provider: { type: 'string', enum: ['mailru', 'vk'] },
                },
              }),
            },
            '400': { $ref: '#/components/responses/ValidationError' },
            '401': { description: 'Invalid or expired id_token' },
            '429': { description: 'Rate limited (30 req/min per client)' },
            '502': { description: 'Provider JWKS unavailable' },
            '503': { description: 'Provider not configured' },
          },
        },
      },
      '/api/v1/sync/push': {
        post: {
          tags: ['sync'],
          summary: 'Push a batch of client operations (idempotent)',
          security: [{ bearerJwt: [] }],
          requestBody: {
            required: true,
            content: jsonContent(pushRequestSchema),
          },
          responses: {
            '200': {
              description: 'Per-operation results',
              content: jsonContent({
                type: 'object',
                required: ['results'],
                properties: {
                  results: {
                    type: 'array',
                    items: {
                      type: 'object',
                      required: ['client_operation_id', 'status'],
                      properties: {
                        client_operation_id: { type: 'string' },
                        status: {
                          type: 'string',
                          enum: ['accepted', 'duplicate', 'rejected'],
                        },
                        result_body: {
                          type: 'object',
                          additionalProperties: true,
                        },
                        error_code: { type: 'string' },
                        error_message: { type: 'string' },
                      },
                    },
                  },
                },
              }),
            },
            '400': { $ref: '#/components/responses/ValidationError' },
            '401': { description: 'Missing/invalid bearer token' },
            '403': { description: 'user_id does not match the token subject' },
          },
        },
      },
      '/api/v1/sync/pull': {
        get: {
          tags: ['sync'],
          summary: 'Pull changes for a user after a cursor',
          security: [{ bearerJwt: [] }],
          parameters: [
            {
              name: 'user_id',
              in: 'query',
              required: false,
              schema: { type: 'string' },
              description:
                'Optional with JWT auth — defaults to the token subject; must match it when given.',
            },
            {
              name: 'after_change_id',
              in: 'query',
              required: false,
              schema: { type: 'integer', minimum: 0, default: 0 },
            },
            {
              name: 'limit',
              in: 'query',
              required: false,
              schema: {
                type: 'integer',
                minimum: 1,
                maximum: 500,
                default: 100,
              },
            },
          ],
          responses: {
            '200': {
              description: 'Page of changes',
              content: jsonContent({
                type: 'object',
                required: ['changes', 'next_change_id', 'has_more'],
                properties: {
                  changes: { type: 'array', items: { type: 'object' } },
                  next_change_id: { type: 'integer' },
                  has_more: { type: 'boolean' },
                },
              }),
            },
            '400': { $ref: '#/components/responses/ValidationError' },
            '401': { description: 'Missing/invalid bearer token' },
            '403': { description: 'user_id does not match the token subject' },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        bearerJwt: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      responses: {
        ValidationError: {
          description: 'Validation failed (error code + issue details)',
          content: jsonContent(validationErrorSchema),
        },
      },
      schemas: {
        SyncPushOperation: z.toJSONSchema(syncPushOperationSchema),
        ValidationResponseBody: validationErrorSchema,
      },
    },
  };
}
