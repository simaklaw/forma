# HANDOFF — FitPulse

**Checkpoint:** 2026-09-29 (sync API hardening + strict RLS 003 + bearer token + migration 004 + cloud E2E verify-sync green incl. activity_credit projection)
**Brand:** FitPulse in UI/bundle. Packages may use `@forma/*` internally.
**APK:** do not build until owner says so.

## On main

1. P0 offline-first — #75
2. P1 sync skeleton → Postgres → HttpOutbox → App drain — #76–#79
3. Today CTA + FitPulse copy + projection stub — #80
4. Sex-specific plans — #81
5. Sync hardening (strict RLS 003, bearer token, migration 004) + cloud E2E `verify-sync` — PR #83 + follow-ups

## In flight

- `feat/p1-projection-writers` — content superseded by main (PostgresProjectionService for activity_credit is on main and covered by E2E); branch can be deleted.

## P1 status

| Item | Status |
|------|--------|
| DDL + RLS SQL (001–004) | yes |
| Sync API + Postgres stores | yes |
| Client outbox + App drain | yes |
| Projection service (noop / memory / postgres activity_credit) | yes |
| `activity_credit` writer E2E | green: terminal event → exactly 1 credit, replay dedupes, intermediate events → 0 credits |
| `exercise_record` Postgres upsert | deferred (FK to session/revision) |
| Auth → RLS GUC | GUC + strict RLS (003) + SYNC_API_TOKEN bearer done; per-user JWT not started |
| Cloud E2E (verify-sync workflow) | green: migrations, strict RLS (11 tables), 401/accepted/duplicate/pull=2, projection credit |

## Rules

1. No APK without owner go-ahead.
2. Brand is **FitPulse** — do not rename to Forma in UI/bundle.
3. No Google Fit — Health Connect only.
4. Preserve frozen catalog exercise ids 1–30.
5. Profile gate: `weightKg` finite > 0 — never invent default body mass.
