# Forma monorepo

Кроссплатформенная экосистема **Forma** (web) + **FitPulse** (mobile) с общим пакетом `@forma/core`.

```
forma/
├── apps/
│   ├── web/          # @forma/web — Vite + React
│   └── mobile/       # @forma/mobile — Expo + React Native
├── packages/
│   └── core/         # @forma/core — engines, MET, OFF, wger, CoachEngine
├── .github/workflows/ci.yml
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
pnpm type-check
pnpm --filter @forma/mobile test
pnpm --filter @forma/web dev
```

## @forma/core (v0.3)

| Область | API |
|---------|-----|
| Метаболизм | `MetabolicEngine`, BMR/TDEE, macros, refeed |
| Тренировки | `WorkoutStats`, `toDateKey` |
| MET | `metForExercise`, `calculateBurnedCalories` |
| API | `OpenFoodFactsService`, `WgerExerciseService` |
| Коуч | `CoachEngine` + `RulesCoach` (порт под on-device LLM) |

Mobile: шимы в `engines/*` и `services/*`.  
Web: OFF-поиск в «Питание», ~ккал в плеере, `coachLine` → `CoachEngine`.

## CI

Корень: `.github/workflows/ci.yml` — `pnpm install` → `type-check` → mobile jest → web domain tests.

## Дальше

- LLM-провайдер (`CoachProvider`) на llama.rn / WebLLM
- Unified store (опционально)
- EAS preview build (нужен `EXPO_TOKEN`)
