/**
 * Zod schemas for the FitPulse sync API.
 *
 * Single source of truth: the same schemas power runtime request
 * validation AND the generated OpenAPI document (src/openapi.ts) —
 * FastAPI-style 'declare once, get types + validation + docs'.
 *
 * Compatibility: existing top-level 'error' codes are preserved;
 * validation failures additionally return an 'issues' array with
 * per-field details.
 */
import { z } from 'zod';

/** Body for POST /api/v1/auth/register. */
export const authRegisterSchema = z.looseObject({
  auth_subject: z.string().min(3).max(200),
});

/**
 * Body for POST /api/v1/auth/oidc.
 * All fields are optional strings — provider-specific flows
 * (auth code + PKCE) validate further in the handler.
 */
export const oidcAuthSchema = z.looseObject({
  provider: z.string().min(1).optional(),
  id_token: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
  redirect_uri: z.string().min(1).optional(),
  code_verifier: z.string().min(1).optional(),
});

/** Full documented shape of one sync operation (used for OpenAPI docs). */
export const syncPushOperationSchema = z.looseObject({
  client_operation_id: z.string().min(1),
  device_id: z.string().min(1),
  aggregate_type: z.string().min(1),
  aggregate_id: z.string().min(1),
  payload_hash: z.string().regex(/^[0-9a-f]{64}$/i),
  payload: z.record(z.string(), z.unknown()),
  occurred_at_client: z.string().min(1),
});

/**
 * Envelope schema for POST /api/v1/sync/push.
 *
 * Deliberately shallow: individual operations are validated one-by-one
 * in the handler so a partial batch gets per-operation 'rejected'
 * results instead of failing the whole request.
 */
export const syncPushRequestSchema = z.looseObject({
  user_id: z.string().min(1),
  operations: z.array(z.looseObject({})),
});

export interface ValidationIssue {
  path: string;
  code: string;
  message: string;
}

export interface ValidationResponseBody {
  error: string;
  message: string;
  issues: ValidationIssue[];
}

export function issuesFromError(error: z.ZodError): ValidationIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.length > 0 ? issue.path.map(String).join('.') : '(root)',
    code: issue.code,
    message: issue.message,
  }));
}

export type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; body: ValidationResponseBody };

/**
 * Parse 'raw' with 'schema', or produce a backwards-compatible
 * 400 body: the existing 'errorCode' + a human 'message' +
 * machine-readable 'issues'.
 */
export function parseOr400<T>(
  schema: z.ZodType<T>,
  raw: unknown,
  errorCode: string,
  message: string,
): ParseResult<T> {
  const parsed = schema.safeParse(raw);
  if (parsed.success) {
    return { ok: true, data: parsed.data };
  }
  return {
    ok: false,
    body: {
      error: errorCode,
      message,
      issues: issuesFromError(parsed.error),
    },
  };
}
