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


## Модель конкурентности (optimistic concurrency)

- **Идемпотентность push**: каждая операция несёт `client_operation_id` + `payload_hash` (SHA-256). Повтор той же операции (тот же ID, тот же хеш) → `duplicate` с сохранённым `result_body`; тот же ID с другим хешем → `rejected` (`payload_hash_mismatch`). Ретраи и офлайн-очередь клиента безопасны.
- **Optimistic concurrency (реализовано, ревью-находка #8)**: операция может нести необязательное целое `expected_version`:
  - отсутствует → last-write-wins: операция принимается безусловно, версия сущности увеличивается (поведение старых клиентов не меняется);
  - `0` → сущность не должна существовать; создание фиксирует версию 1;
  - `N` → сущность должна быть ровно в версии `N`; при совпадении операция принимается, новая версия — `N + 1`.
- **Конфликт версий**: несовпадение → per-op `rejected` с `error_code: "version_conflict"` и `result_body: { current_version, expected_version }`. Операция не применяется, не попадает ни в change feed, ни в idempotency-store — клиент может повторить **тот же** `client_operation_id` с исправленной версией.
- **Отслеживание версий**: принятая операция возвращает `result_body.entity_version`; каждый change в pull несёт `entity_version`.
- **Хранилище версий**: `platform.entity_head` (миграция 008) — `(user_id, entity_type, entity_id) → current_version`, строгий RLS по образцу 003; при миграции засеяно из `platform.sync_change`. Compare-and-increment выполняется атомарно в транзакции unit of work.
- **Клиентская стратегия на конфликт**: pull → разрешение (field-level merge / перезапись / оставить локальную) → повторный push как новая операция с актуальным `expected_version`. Конфликт-очередь в UI mobile — будущая задача (синк-движок в mobile ещё не подключён к push).
- **Legacy**: last-write-wins остаётся документированным поведением для операций без `expected_version`; обе версии конкурирующих правок по-прежнему остаются в change feed.
