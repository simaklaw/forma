# Forma monorepo

Кроссплатформенная экосистема **Forma** (web) + **FitPulse** (mobile) с общим пакетом `@forma/core`.

```
forma/
├── apps/
│   ├── web/          # @forma/web — Vite + React
│   └── mobile/       # @forma/mobile — Expo + React Native
├── packages/
│   └── core/         # движки, API, store, ILocalAITrainer
├── .github/workflows/ci.yml
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

## Требования

- Node 22+
- pnpm 9.15+ (`packageManager` в корневом package.json)

```bash
npm i -g pnpm@9.15.0
git clone https://github.com/simaklaw/forma.git && cd forma
pnpm install
pnpm type-check
pnpm --filter @forma/mobile test
pnpm --filter @forma/web dev
```

## @forma/core (v0.4)

| Область | API |
|---------|-----|
| Метаболизм | `MetabolicEngine`, `ACTIVITY_FACTOR` |
| Тренировки | `WorkoutStats`, MET |
| API | `OpenFoodFactsService`, `WgerExerciseService` |
| Стор | `useFormaStore` (без persist — persist в apps) |
| ИИ | `ILocalAITrainer`, `RulesLocalAITrainer`, `CoachEngine` |

Mobile Metro: `watchFolders` на корень монорепо, `disableHierarchicalLookup`.

Локальный LLM (llama.rn / WebLLM) подключается через `CoachEngine.setTrainer(...)` без смены UI.

## CI

`.github/workflows/ci.yml` — pnpm из `packageManager`, Node 22, type-check + tests.

## Дальше

- WebLLM / llama.rn адаптеры на `ILocalAITrainer`
- Persist-обёртки store в apps
- EAS preview (`EXPO_TOKEN`)
