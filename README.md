# Forma monorepo

Кроссплатформенная экосистема **Forma** (web) + **FitPulse** (mobile) с общим пакетом `@forma/core`.

```
forma/
├── apps/
│   ├── web/          # @forma/web — Vite + React
│   └── mobile/       # @forma/mobile — Expo + React Native
├── packages/
│   └── core/         # @forma/core — engines, MET, OFF, wger
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

## Требования

- Node 20+
- [pnpm](https://pnpm.io) 9+

```bash
npm i -g pnpm@9
git clone https://github.com/simaklaw/forma.git && cd forma
pnpm install
```

## Скрипты

| Команда | Описание |
|---------|----------|
| `pnpm --filter @forma/web dev` | веб → http://localhost:8080 |
| `pnpm --filter @forma/mobile dev` | Expo |
| `pnpm type-check` | типы |
| `pnpm --filter @forma/mobile test` | jest (engines + wger mocks) |

## @forma/core (v0.2)

| Область | API |
|---------|-----|
| Метаболизм | `MetabolicEngine`, `calculateTargets`, BMR/TDEE, refeed |
| Тренировки | `WorkoutStats` (стрики, объём, PR, `toDateKey`) |
| MET | `EXERCISE_MET`, `metForExercise`, `calculateBurnedCalories` |
| Питание API | `OpenFoodFactsService` (barcode + search) |
| Упражнения API | `WgerExerciseService` (category + image search) |

Mobile: шимы в `src/engines/*` и `src/services/*` — старые импорты работают.  
Web: `import { … } from '@forma/core'` — поиск OFF в «Питание», ~ккал в плеере.

`RestTimerEngine` остаётся в mobile (haptics / AppState).

## Дальше

- Unified store API (опционально)
- On-device AI adapters
- EAS / Vercel CI
