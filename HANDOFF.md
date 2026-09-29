# HANDOFF — FitPulse

**Checkpoint:** 2026-09-29 (P1 Postgres store behind DATABASE_URL)
**Brand:** FitPulse (not Forma rebrand). Packages may still use `@forma/*` internally.
**APK:** do not build until owner says so.

## On main

1. SQLite migrations + weight snapshot, home mode, media, coach, nutrition, HC/Samsung
2. Progress / coach-onboarding polish (#73–#74)
3. P0 Early Leave — pause / finish partial / abandon (#75)
4. P1 skeleton — DDL + sync-contract + Hono API + docker-compose (#76)

## In flight

- `feat/p1-postgres-idempotency-store` — real `platform.client_operation` + `sync_change` when `DATABASE_URL` is set; memory default for CI/tests

## P0 status (FitPulse mobile) — DONE

| Item | Status |
|------|--------|
| Brand FitPulse | yes (`app.fitpulse.*`) |
| workout-domain + SQLite + outbox | yes |
| Session snapshot / weightKgSnapshot | yes |
| Wall-clock RestTimerEngine + AppState | yes |
| Early Leave (pause / save / abandon) | yes (#75) |

## P1 status

| Item | Status |
|------|--------|
| packages/db DDL | yes (#76) |
| packages/sync-contract DTOs | yes (#76) |
| apps/api Hono push/pull | yes (#76) |
| In-memory idempotency + TTL | yes (#76) |
| docker-compose Postgres | yes (#76) |
| Postgres IdempotencyStore + ChangeFeed | this branch |
| RLS policies | not started |
| Projection handlers | not started |
| Client outbox → push wiring | not started |

## Local Postgres

```bash
docker compose up -d
psql postgresql://fitpulse:fitpulse@localhost:5432/fitpulse -f packages/db/migrations/001_init.sql
export DATABASE_URL=postgresql://fitpulse:fitpulse@localhost:5432/fitpulse
pnpm --filter @forma/api dev
```

Without `DATABASE_URL`, API uses in-memory stores (same as CI).

## Rules

1. No APK without owner go-ahead.
2. Brand is **FitPulse** — do not rename to Forma in UI/bundle.
3. No Google Fit — Health Connect only.
4. Preserve frozen catalog exercise ids 1–30.
5. Profile gate: `weightKg` finite > 0 — never invent default body mass.
