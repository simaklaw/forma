# Forma monorepo

Кроссплатформенная экосистема **Forma** (web) + **FitPulse** (mobile), ядро `@forma/core`.

## Запуск

Node 22+, pnpm 9.15+

```bash
pnpm install
pnpm type-check
pnpm test
pnpm --filter @forma/web dev
```

## Ядро @forma/core v0.5

- MetabolicEngine, WorkoutStats (`todayKey` / `toDateKey`), ACTIVITY_FACTOR, MET
- Open Food Facts + wger clients
- `useFormaStore` + `createPersistedFormaStore(storage)`
- `ILocalAITrainer` / `RulesLocalAITrainer` / `CoachEngine` (`isLlmReady`)

## Локальный ИИ

| Платформа | Адаптер | UI |
|-----------|---------|-----|
| Web | `WebLocalAITrainer` → WebLLM (WebGPU) | `/coach` + статус WebLLM/Rules |
| Mobile | `LlamaLocalAITrainer` → llama.rn 0.9 / rules | вкладка **Тренер** + `WorkoutCoachCard` |

GGUF не в репозитории; URL — `EXPO_PUBLIC_LLAMA_MODEL_URL` (`apps/mobile/.env.example`).

## CI & EAS

[Monorepo CI](https://github.com/simaklaw/forma/actions) — frozen lockfile, type-check, tests.

Native development client:

1. `pnpm install` (после добавления `expo-dev-client` обновите и закоммитьте `pnpm-lock.yaml`).
2. Один раз: `cd apps/mobile && npx eas-cli@latest init` → реальный `extra.eas.projectId` в `app.json` (см. `apps/mobile/EAS-SETUP.md`).
3. Secret `EXPO_TOKEN` → workflow [EAS Build](https://github.com/simaklaw/forma/actions/workflows/eas-build.yml), profile **development**.

## Дальше

1. EAS Android development build + dev client на устройстве
2. GGUF download / RAM / tokens/s
3. Persist истории чата тренера при необходимости

## Architecture

See [the workout architecture comparison](docs/architecture/WORKOUT_ARCHITECTURE_COMPARISON.md) for the reference analysis, target workout database model, player state machine, UX integration plan, and roadmap.
