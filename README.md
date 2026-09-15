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

## Локальный ИИ (этап 3)

| Платформа | Адаптер | UI |
|-----------|---------|-----|
| Web | `WebLocalAITrainer` → WebLLM (WebGPU) | `/coach` + статус WebLLM/Rules + progress |
| Mobile | `LlamaLocalAITrainer` → llama.rn 0.9 / rules fallback | вкладка **Тренер** + `WorkoutCoachCard` |

Адаптеры регистрируются в `CoachEngine` **сразу** при boot; модель догружается в фоне. Пока LLM не готов — тот же adapter отвечает через rules fallback. GGUF **не** в репозитории; URL — `EXPO_PUBLIC_LLAMA_MODEL_URL` (`apps/mobile/.env.example`).

## CI

[Monorepo CI](https://github.com/simaklaw/forma/actions) — type-check + mobile jest + web tests. Зелёный на main.

`pnpm install --frozen-lockfile` + cache по `pnpm-lock.yaml`.

Native: [EAS Build](https://github.com/simaklaw/forma/actions/workflows/eas-build.yml) (manual). Нужен secret `EXPO_TOKEN`.

## Дальше

1. EAS development build + проверка GGUF на устройстве
2. Профилирование RAM / tokens/s на 4 ГБ устройствах
3. История чата тренера (persist) при необходимости
