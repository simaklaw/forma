# Forma monorepo

Кроссплатформенная экосистема **Forma** (web) + **FitPulse** (mobile) с общим пакетом `@forma/core`.

```
forma/
├── apps/
│   ├── web/          # @forma/web — Vite + React (домашние тренировки, медиа)
│   └── mobile/       # @forma/mobile — Expo + React Native (engines, OFF, wger)
├── packages/
│   └── core/         # @forma/core — MetabolicEngine, WorkoutStats, MET
├── package.json      # pnpm workspaces + turbo
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

## Скрипты (корень)

| Команда | Описание |
|---------|----------|
| `pnpm dev` | turbo: dev во всех пакетах, где есть скрипт |
| `pnpm --filter @forma/web dev` | только веб (порт 8080) |
| `pnpm --filter @forma/mobile dev` | только Expo |
| `pnpm type-check` | проверка типов |
| `pnpm --filter @forma/mobile test` | jest (mobile, в т.ч. engines) |

## @forma/core (Шаг 2)

Общая UI-agnostic логика:

- `MetabolicEngine` — Mifflin-St Jeor, TDEE, macros, refeed/diet-break, 1RM/RPE
- `WorkoutStats` — стрики, объём, PR, prune set logs, `toDateKey` / `todayKey`
- `EXERCISE_MET` + `calculateBurnedCalories` — расход по MET

Mobile импортирует через шимы `apps/mobile/src/engines/*` (старые пути `@/engines/...` работают).
Web: `import { … } from '@forma/core'` или `~/lib/core`.

`RestTimerEngine` остаётся в mobile (expo-haptics / AppState).

## Дальше

- Единый Zustand-стор поверх core (опционально)
- OpenFoodFacts / wger клиенты в core
- On-device AI adapters (Этап 3 отчёта)
