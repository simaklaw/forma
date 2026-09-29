# FitPulse monorepo

**FitPulse** — мобильный тренер и дневник (Expo). Внутренние пакеты могут сохранять scope `@forma/*`.

## Запуск

Node 22+, pnpm 9.15+

```bash
pnpm install
pnpm type-check
pnpm test
pnpm --filter @forma/mobile start
# API (P1):
# export DATABASE_URL=postgresql://fitpulse:fitpulse@localhost:5432/fitpulse
# pnpm --filter @forma/api test
```

## Ядро @forma/core

- MetabolicEngine, WorkoutStats, MET
- Open Food Facts + wger clients
- CoachEngine / RulesLocalAITrainer

## Локальный ИИ

| Платформа | Адаптер |
|-----------|---------|
| Mobile | `LlamaLocalAITrainer` → llama.rn / rules |
| Web | `WebLocalAITrainer` → WebLLM (если apps/web в репо) |

GGUF не в репозитории; URL — `EXPO_PUBLIC_LLAMA_MODEL_URL`.

## Sync (P1)

```bash
docker compose up -d
psql postgresql://fitpulse:fitpulse@localhost:5432/fitpulse -f packages/db/migrations/001_init.sql
psql postgresql://fitpulse:fitpulse@localhost:5432/fitpulse -f packages/db/migrations/002_rls_basic.sql
export DATABASE_URL=postgresql://fitpulse:fitpulse@localhost:5432/fitpulse
# mobile: EXPO_PUBLIC_SYNC_API_URL=http://10.0.2.2:8787
```

## Branding

- UI / bundle: **FitPulse** (`app.fitpulse.*`)
- Packages: `@forma/*` (internal, no user-facing rename required)
