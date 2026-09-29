# FitPulse monorepo

**FitPulse** — мобильный тренер и дневник (Expo). Внутренние пакеты могут сохранять scope `@forma/*`.

## Запуск

Node 22+, pnpm 9.15+

```bash
pnpm install
pnpm type-check
pnpm test
pnpm --filter @forma/mobile start
# API (P1):
# export DATABASE_URL=postgresql://fitpulse:fitpulse@localhost:5432/fitpulse
# pnpm --filter @forma/api test
```

## Работа без компьютера (GitHub Codespaces)

Всё, что нужно для разработки, доступно из браузера телефона:

1. Репозиторий → **Code** → **Codespaces** → create. devcontainer уже настроен (порты 8787 API и 8081 Expo проброшены).
2. В браузерном терминале работают все pnpm-команды из этого README.
3. Быстрая проверка всего стека синка: **Actions** → **Verify sync setup (E2E)** → **Run workflow**. Workflow сам поднимает Postgres, применяет миграции, генерирует токен и проверяет API настоящими HTTP-запросами. Итог — в Summary прогона; при падении диагностика публикуется в ветку `ci-logs`.
4. Мобильное приложение: Expo Go на телефоне, подключённое к URL Codespace.

Бесплатный лимит Codespaces: 120 core-часов/мес.

## Ядро @forma/core

- MetabolicEngine, WorkoutStats, MET
- Open Food Facts + wger clients
- CoachEngine / RulesLocalAITrainer

## Локальный ИИ

| Платформа | Адаптер |
|-----------|---------|
| Mobile | `LlamaLocalAITrainer` → llama.rn / rules |
| Web | `WebLocalAITrainer` → WebLLM (если apps/web в репо) |

GGUF не в репозитории; URL — `EXPO_PUBLIC_LLAMA_MODEL_URL`.

## Sync (P1)

```bash
pnpm db:up        # docker compose: Postgres 16
pnpm db:migrate   # миграции 001–004
pnpm sync:setup   # генерирует SYNC_API_TOKEN в apps/api/.env и EXPO_PUBLIC_SYNC_API_TOKEN в apps/mobile/.env
pnpm api:dev      # API на :8787 с bearer-авторизацией
```

Миграции: 001_init → 002_rls_basic → 003_rls_strict (строгий RLS + FORCE) → 004_device_platform_unknown.

Клиент отправляет `Authorization: Bearer $EXPO_PUBLIC_SYNC_API_TOKEN`; без токена API отвечает 401.

## Branding

- UI / bundle: **FitPulse** (`app.fitpulse.*`)
- Packages: `@forma/*` (internal, no user-facing rename required)
