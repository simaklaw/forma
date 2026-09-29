# HANDOFF — FitPulse

**Checkpoint:** 2026-09-29 (sync API hardening merged: atomic UoW, strict RLS 003, bearer token, migration 004, E2E verify-sync workflow green)
**Brand:** FitPulse in UI/bundle. Packages may use `@forma/*` internally.
**APK:** do not build until owner says so.

## On main

1. P0 offline-first — #75
2. P1 sync skeleton → Postgres → HttpOutbox → App drain — #76–#79
3. Today CTA + FitPulse copy + projection stub — #80
4. Sex-specific plans — #81
5. Sync hardening (strict RLS 003, bearer token, migration 004 device platform) + cloud E2E `verify-sync` — PR #83 + follow-ups

## In flight

- `feat/p1-projection-writers` — Memory + Postgres `activity_credit` on terminal session ops

## P1 status

| Item | Status |
|------|--------|
| DDL + RLS SQL (001–004) | yes |
| Sync API + Postgres stores | yes |
| Client outbox + App drain | yes |
| Projection service (noop / memory) | yes |
| `activity_credit` writer (memory + postgres) | this branch |
| `exercise_record` Postgres upsert | deferred (FK to session/revision) |
| Auth → RLS GUC | GUC + strict RLS (003) + SYNC_API_TOKEN bearer done; per-user JWT not started |
| Cloud E2E (verify-sync workflow) | green: migrations, strict RLS (11 tables), 401/accepted/duplicate/pull=1 |

## Rules

1. No APK without owner go-ahead.
2. Brand is **FitPulse** — do not rename to Forma in UI/bundle.
3. No Google Fit — Health Connect only.
4. Preserve frozen catalog exercise ids 1–30.
5. Profile gate: `weightKg` finite > 0 — never invent default body mass.
