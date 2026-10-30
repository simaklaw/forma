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

## Версии: причины и ограничения

Зафиксировано по итогам ревью (октябрь 2026) — почему версии различаются и что нельзя менять точечно.

- **React 18.2.0 на всём воркспейсе** — включая web. Причина: `.npmrc` требует `node-linker=hoisted` (плоская раскладка node_modules, обязательна для Expo/RN native-сборок), а RN 0.74 работает только с react 18.2.0. В плоской раскладке в корне живёт одна версия react — двух миров (RN 18 + web 19) быть не может; сломанная пара react 18 + react-dom 19 починена в #275 (web теперь на честной паре react 18.2.0 + react-dom 18.2.0). **Миграция на react 19** — только после апгрейда Expo SDK 52+ / RN 0.76, одним PR со снятием `pnpm.overrides` в корне.
- **TypeScript `~5.3.3` в mobile** — ограничение Expo SDK 51; остальные воркспейсы на `^5.7.0`. Не поднимать TS в mobile отдельно от Expo.
- **Zustand: mobile 4.5.2 vs core/web 5.x** — в нативном бандле живут две мажорные копии (в корне резолвится 5.x, в apps/mobile вложена 4.x). Риск: сторы `@forma/core` и сторы mobile могут оказаться в разных инстансах zustand — не смешивать сторы между слоями до унификации. Унификация — вместе с апгрейдом Expo.

## Branding

- UI / bundle: **FitPulse** (`app.fitpulse.*`)
- Packages: `@forma/*` (internal, no user-facing rename required)
