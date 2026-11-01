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

- **React 19.2.0 на всём воркспейсе** — включая web и mobile. pnpm overrides единого react-мира сняты (с шага SDK 54): каждый воркспейс сам пинит свою пару (react/react-dom 19.2.0, @types/react ~19.2.2), версии совпадают. `.npmrc` с `node-linker=hoisted` остаётся: Expo по-прежнему требует плоскую раскладку для native-сборок, в корне живёт одна версия react.
- **TypeScript `~5.9.2` в mobile** — версия из шаблона Expo SDK 54+ (в SDK 55 не изменилась; tsconfig.base: `module: preserve`); остальные воркспейсы на `^5.7.0`. Не поднимать TS в mobile отдельно от Expo.
- **Zustand 5.x везде** — mobile переведён 4.5.2 → ^5.0.0 вместе с SDK 54; API-миграция не потребовалась (сторы уже на современном `create()` + `persist`/`createJSONStorage`). Один инстанс библиотеки на монорепо — сторы `@forma/core` и mobile больше не могут разойтись по инстансам.
- **New Architecture включена (шаг 4 апгрейда Expo)** — `newArchEnabled: true` в app.json: react-native-reanimated 4.2.1 + react-native-worklets 0.7.4 (bundled SDK 55; babel-плагин `react-native-worklets/plugin` вместо `react-native-reanimated/plugin`), @react-native-community/slider 5.2.2, @gorhom/bottom-sheet ^5.2.14 (v4 не поддерживает New Arch). SDK 54 — последний SDK с поддержкой legacy; SDK 55+ работает только на New Arch — блокер снят.

## Branding

- UI / bundle: **FitPulse** (`app.fitpulse.*`)
- Packages: `@forma/*` (internal, no user-facing rename required)
