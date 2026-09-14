# Forma monorepo

Кроссплатформенная экосистема **Forma** (web) + **FitPulse** (mobile), ядро `@forma/core`.

## Запуск

Node 22+, pnpm 9.15+

```bash
pnpm install
pnpm type-check
pnpm --filter @forma/mobile test
pnpm --filter @forma/web dev
```

## Ядро @forma/core v0.5

- MetabolicEngine, WorkoutStats, ACTIVITY_FACTOR, MET, OFF, wger
- `useFormaStore` + `createPersistedFormaStore(storage)`
- `ILocalAITrainer` / `RulesLocalAITrainer` / `CoachEngine`

## Локальный ИИ (этап 3)

| Платформа | Адаптер | Сейчас |
|-----------|---------|--------|
| Web | `WebLocalAITrainer` | Rules + WebGPU detect; слот под WebLLM |
| Mobile | `LlamaLocalAITrainer` | Rules; слот под llama.rn + GGUF |

UI: чат «Тренер» в web (`/coach`). Модель не хостится в репо (≈700 МБ).

## CI

`.github/workflows/ci.yml` — pnpm из `packageManager`, Node 22. Кэш pnpm выключён, пока нет `pnpm-lock.yaml` в git.

## Дальше

1. Закоммитить `pnpm-lock.yaml` (`pnpm install` локально → git add)
2. WebLLM / llama.rn в готовые слоты адаптеров
3. EAS (`EXPO_TOKEN`)
