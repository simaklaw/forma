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
- `ILocalAITrainer` / `RulesLocalAITrainer` / `CoachEngine`

## Локальный ИИ (этап 3)

| Платформа | Адаптер | UI |
|-----------|---------|-----|
| Web | `WebLocalAITrainer` | `/coach` + совет на «Сегодня» |
| Mobile | `LlamaLocalAITrainer` | `WorkoutCoachCard` на экране тренировки |

Оба адаптера сейчас на `RulesLocalAITrainer` (offline). Слоты под WebLLM / llama.rn + GGUF готовы; веса модели **не** в репозитории.

## CI

[Monorepo CI](https://github.com/simaklaw/forma/actions) — type-check + mobile jest (node) + web domain tests. Зелёный на main.

`pnpm-lock.yaml` пока не закоммичен: `pnpm install --frozen-lockfile=false`. После локального `pnpm install` добавьте lockfile и включите `cache: pnpm` в workflow.

## Дальше

1. Закоммитить `pnpm-lock.yaml`
2. Подключить WebLLM / llama.rn в адаптеры
3. EAS Build (`EXPO_TOKEN`)
4. Сгенерировать `routeTree.gen.ts` в CI для полного web type-check routes
