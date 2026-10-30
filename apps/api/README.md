# @forma/api

FitPulse sync API — Hono on Node 22, TypeScript, zero-build (tsx + node:test).

## Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | — | Liveness + active auth/store mode |
| GET | `/api/openapi.json` | — | OpenAPI 3.1 document (from zod schemas) |
| GET | `/api/docs` | — | Interactive Swagger UI (renders openapi.json) |
| GET | `/api/v1/nutrition/product/:barcode` | — | Open Food Facts proxy (ODbL; TTL cache: Postgres or in-memory) |
| POST | `/api/v1/auth/register` | — | auth_subject → JWT (when JWT_SECRET set) |
| POST | `/api/v1/auth/oidc` | — | Mail.ru / VK ID token or code+PKCE → JWT |
| POST | `/api/v1/sync/push` | Bearer | Idempotent batch of client operations |
| GET | `/api/v1/sync/pull` | Bearer | Changes after a cursor |

## Validation

Requests are validated with zod schemas (src/validation.ts) — the same
schemas generate the OpenAPI document (src/openapi.ts), so types,
validation and docs never drift apart.

Validation failures return 400 with the existing error codes plus a
machine-readable issues array:

```json
{
  "error": "invalid_body",
  "message": "body must contain user_id (non-empty string) and operations (array)",
  "issues": [{ "path": "user_id", "code": "invalid_type", "message": "..." }]
}
```

## Commands

- `pnpm api:dev` — dev server (tsx watch)
- `pnpm --filter @forma/api type-check`
- `pnpm --filter @forma/api test`

## Env (apps/api/.env)

- `DATABASE_URL` — postgres; omit → in-memory stores
- `JWT_SECRET` — per-user JWT auth on /api/v1/sync/*
- `SYNC_API_TOKEN` — shared bearer token (legacy fallback)
- `PORT` — default 8787

## Ограничения масштабирования (известные)

- **OIDC rate-limiter — in-memory** (`createOidcRateLimiter`: Map в процессе, 30 req/мин на ключ). При более чем одной машине Fly (auto_start_stop) лимит не общий — каждая машина считает независимо. Для текущего масштаба приемлемо; при горизонтальном масштабировании вынести в общий стор (Postgres / Fly KV / Redis).
- **Open-mode guard**: при `DATABASE_URL` без `JWT_SECRET`/`SYNC_API_TOKEN` API отказывается стартовать (#273).
