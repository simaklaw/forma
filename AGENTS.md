# AGENTS.md — правила для AI-агентов в репозитории forma

Этот файл читают AI-агенты (Cursor, Codex CLI, Claude Code, Copilot, Vibe и др.) перед работой с кодом. Цель — чтобы агент не ломал CI, соблюдал контракты и не наступал на известные грабли.

## Проект

FitPulse (FORMA) — фитнес-приложение. pnpm-монорепо: **pnpm@9.15.0, Node >= 22, Turbo**. TypeScript strict, ESM, тесты через `node --experimental-strip-types --test`.

- `apps/api` — Hono backend (порт 8787): `/health`, `/api/v1/auth/register`, `/api/v1/auth/oidc`, `/api/v1/sync/push`, `/api/v1/sync/pull`, `/api/openapi.json` (OpenAPI 3.1), `/api/docs` (Swagger UI). Хранилище: Postgres или in-memory.
- `apps/mobile` — React Native (Expo).
- `apps/web` — веб-приложение.
- `packages/core`, `packages/workout-domain` — домен.
- `packages/db` — SQL-миграции + strict RLS.
- `packages/sync-contract` — DTO push/pull и типизированный клиент `createSyncClient`.

## Команды

```
pnpm install                     # CI ставит с --frozen-lockfile
pnpm --filter @forma/api dev     # локальный API (pnpm api:dev)
pnpm db:up && pnpm db:migrate    # Postgres + миграции
pnpm sync:setup                  # сгенерировать .env секреты (JWT_SECRET, SYNC_API_TOKEN)
pnpm --filter @forma/<pkg> type-check
pnpm --filter @forma/<pkg> test
```

## CI: как устроен и известные грабли

**Monorepo CI** (Install · Type-check · Test): frozen-lockfile → `git diff --check` (никаких trailing whitespace) → Python-тесты `scripts/tests` → prettier-гейт (только файлы из `format:check:gate`) → build web → type-check core → type-check P1 (sync-contract + api) → тесты всех пакетов.

**E2E verify-sync** (Postgres · Migrations · JWT): запускается на PR, затрагивающих `apps/api/**`, `packages/db/**`, `Dockerfile`, `fly.toml`, `scripts/apply-db-migrations.sh`, `scripts/start-api-container.sh`.

Грабли:

1. **Коммиты от github-actions[bot] оставляют workflow в `action_required`** — CI не стартует сам. После такого пуша запушьте обычный пользовательский коммит (даже правку README), чтобы перезапустить пайплайн.
2. **Никогда не правьте `pnpm-lock.yaml` руками.** CI ставит с `--frozen-lockfile`; расхождение lockfile ↔ package.json = падение установки. Новые зависимости — только через pnpm, в отдельном PR.
3. **Экранирование при пуше через GitHub API/JSON.** Экранированная последовательность `\n` в JSON-пейлоаде превращается в реальный перенос строки внутри строкового литерала кода — это уже ломало tsc (PR #223). После программного пуша читайте файл обратно и сверяйте.
4. При падении CI публикует логи в ветку `ci-logs/<run_id>/` — диагностику искать там, а не угадывать.

## API-контракт — главный инвариант

Единый источник истины, FastAPI-подход:

```
zod-схемы (apps/api/src/validation.ts)
  → OpenAPI 3.1 (apps/api/src/openapi.ts → /api/openapi.json)
    → Swagger UI (/api/docs)
      → типы и клиент (packages/sync-contract: types.ts, client.ts)
```

- Меняя API, обновляйте **всю цепочку**: zod-схему, `openapi.ts`, типы `@forma/sync-contract`, клиент.
- Типы `@forma/sync-contract` — публичный контракт; изменения только отдельным PR с обоснованием.
- Коды ошибок (`invalid_json`, `invalid_body`, `invalid_auth_subject`, `user_id_mismatch`, `unauthorized` и т.д.) — публичный контракт мобильного приложения, **не переименовывать**.
- Миграции RLS в `packages/db` не трогать без крайней необходимости: за них отвечает strict-гейт в E2E (≥10 таблиц с FORCE ROW LEVEL SECURITY).

## Правила безопасности и стиля

- **Никогда не коммитить секреты** (`JWT_SECRET`, `SYNC_API_TOKEN`) — только через `.env` (`pnpm sync:setup`; `.env` в `.gitignore`).
- **Не force-push в main**; в main — только через PR (squash-merge).
- **Перед PR**: прогнать `type-check` и тесты затронутых пакетов локально. Не угадывать результат — проверять.
- **Не выдумывать содержимое файлов** — читать актуальную версию с сервера (состояние могло измениться после вашего последнего касания).
- Коммиты: conventional commits (`feat`/`fix`/`ci`/`docs`/...), небольшие PR, стиль — как в соседнем коде. Перед PR полезно `pnpm format`.
- Открыв PR — дождаться CI и только потом просить ревью/мерж.
