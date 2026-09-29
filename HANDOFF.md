# HANDOFF — FitPulse

**Checkpoint:** 2026-09-29 (P1 HttpOutboxTransport + RLS SQL)
**Brand:** FitPulse (not Forma rebrand). Packages may still use `@forma/*` internally.
**APK:** do not build until owner says so.

## On main

1. P0 offline-first mobile (SQLite, Early Leave, HC/Samsung) — #75
2. P1 skeleton DDL + sync-contract + Hono — #76
3. Postgres IdempotencyStore + ChangeFeed (`DATABASE_URL`) — #77

## In flight

- `feat/p1-http-outbox-transport` — mobile `HttpOutboxTransport` → push API; `002_rls_basic.sql`

## P1 status

| Item | Status |
|------|--------|
| packages/db DDL | yes (#76) |
| sync-contract + Hono push/pull | yes (#76) |
| Postgres stores (DATABASE_URL) | yes (#77) |
| HttpOutboxTransport (client) | this branch |
| RLS SQL (basic) | this branch |
| Wire transport in App.tsx / background | not started |
| Projection handlers (server) | not started |
| Auth-bound user_id | not started |

## Local sync loop

```bash
docker compose up -d
psql postgresql://fitpulse:fitpulse@localhost:5432/fitpulse -f packages/db/migrations/001_init.sql
psql postgresql://fitpulse:fitpulse@localhost:5432/fitpulse -f packages/db/migrations/002_rls_basic.sql
export DATABASE_URL=postgresql://fitpulse:fitpulse@localhost:5432/fitpulse
# API: pnpm --filter @forma/api exec tsx src/index.ts  (or createAppFromEnv)
# Mobile: EXPO_PUBLIC_SYNC_API_URL=http://10.0.2.2:8787
```

## Rules

1. No APK without owner go-ahead.
2. Brand is **FitPulse** — do not rename to Forma in UI/bundle.
3. No Google Fit — Health Connect only.
4. Preserve frozen catalog exercise ids 1–30.
5. Profile gate: `weightKg` finite > 0 — never invent default body mass.
