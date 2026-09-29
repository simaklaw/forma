# HANDOFF — FitPulse

**Checkpoint:** 2026-09-29 (P1 skeleton)
**Brand:** FitPulse (not Forma rebrand). Packages may still use `@forma/*` internally.
**APK:** do not build until owner says so.

## On main

1. SQLite migrations + weight snapshot, home mode, media, coach, nutrition, HC/Samsung
2. Progress / coach-onboarding polish (#73–#74)
3. P0 Early Leave — pause / finish partial / abandon (#75)

## In flight

- `feat/p1-postgres-sync-skeleton` — P1.1 DDL + P1.2 sync API stubs

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
| packages/db DDL (schemas + tables) | this branch |
| packages/sync-contract DTOs | this branch |
| apps/api Hono push/pull stubs | this branch |
| Real Postgres + RLS + idempotency store | not started |
| Projection handlers (records, activity_credit) | not started |
| Client outbox → push wiring | not started |

## Rules

1. No APK without owner go-ahead.
2. Brand is **FitPulse** — do not rename to Forma in UI/bundle.
3. No Google Fit — Health Connect only.
4. Preserve frozen catalog exercise ids 1–30.
5. Profile gate: `weightKg` finite > 0 — never invent default body mass.
