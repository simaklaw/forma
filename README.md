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

Для нативного dev client или preview APK используйте ручной workflow [EAS Build](https://github.com/simaklaw/forma/actions/workflows/eas-build.yml): в GitHub Actions выберите `Run workflow`, platform и EAS profile. Workflow намеренно не запускается на каждый push или pull request, поскольку EAS Build потребляет ресурсы и требует нативной сборки. Перед запуском добавьте `EXPO_TOKEN` в secrets репозитория и один раз привяжите приложение к Expo через `npx eas-cli@latest init`; эта команда записывает account-specific `expo.extra.eas.projectId`. Подробности находятся в [`apps/mobile/EAS-SETUP.md`](apps/mobile/EAS-SETUP.md). GGUF URL задаётся отдельно через `EXPO_PUBLIC_LLAMA_MODEL_URL` в EAS environment.

## Дальше

1. Запустить ручной EAS dev client / preview build (`EXPO_TOKEN`) и проверить GGUF на устройствах
2. Профилировать память и скорость на мобильных устройствах с 4 ГБ ОЗУ
