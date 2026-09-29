# HANDOFF — FitPulse

**Checkpoint:** 2026-09-29 (App outbox drain lifecycle)
**Brand:** FitPulse (not Forma rebrand). Packages may still use `@forma/*` internally.
**APK:** do not build until owner says so.

## On main

1. P0 offline-first mobile — #75
2. P1 DDL + sync-contract + Hono — #76
3. Postgres stores (`DATABASE_URL`) — #77
4. HttpOutboxTransport + RLS SQL — #78

## In flight

- `feat/p1-app-outbox-drain` — `startOutboxDrainLifecycle` in App.tsx (launch + AppState active)

## P1 status

| Item | Status |
|------|--------|
| packages/db DDL + RLS SQL | yes |
| sync-contract + Hono push/pull | yes |
| Postgres stores | yes |
| HttpOutboxTransport | yes (#78) |
| App lifecycle drain | this branch |
| Auth / JWT → RLS GUC | not started |
| Server projections | not started |

## Sync env

```bash
export DATABASE_URL=postgresql://fitpulse:fitpulse@localhost:5432/fitpulse
# mobile: EXPO_PUBLIC_SYNC_API_URL=http://10.0.2.2:8787
```

Without `EXPO_PUBLIC_SYNC_API_URL`, drain uses noop transport (no network).

## Rules

1. No APK without owner go-ahead.
2. Brand is **FitPulse** — do not rename to Forma in UI/bundle.
3. No Google Fit — Health Connect only.
4. Preserve frozen catalog exercise ids 1–30.
5. Profile gate: `weightKg` finite > 0 — never invent default body mass.
