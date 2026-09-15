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
| Web | `WebLocalAITrainer` → WebLLM (WebGPU) | `/coach` + совет на «Сегодня» |
| Mobile | `LlamaLocalAITrainer` → llama.rn 0.9 / rules fallback | `WorkoutCoachCard` на экране тренировки |

Web-адаптер лениво загружает `Llama-3.2-1B-Instruct-q4f16_1-MLC` только при наличии WebGPU; после первой загрузки WebLLM использует браузерный кэш. При отсутствии WebGPU, сбое загрузки или в SSR/test окружении используется приватный `RulesLocalAITrainer` без сети. Мобильный адаптер подключает `llama.rn@0.9.7` через lazy GGUF download в Expo document storage и работает на rules fallback без `EXPO_PUBLIC_LLAMA_MODEL_URL`. GGUF-веса **не** хранятся в репозитории; настройка URL описана в `apps/mobile/.env.example`.

## CI

[Monorepo CI](https://github.com/simaklaw/forma/actions) — type-check + mobile jest (node) + web domain tests. Зелёный на main.

CI использует `pnpm install --frozen-lockfile` и кэш pnpm по `pnpm-lock.yaml`.

## Дальше

1. Подготовить native Expo dev client / EAS Build (`EXPO_TOKEN`) и проверить GGUF на устройствах
2. Профилировать память и скорость на мобильных устройствах с 4 ГБ ОЗУ
