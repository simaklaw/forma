# HANDOFF — FitPulse

**Checkpoint:** 2026-09-30 (P2 per-user JWT done end-to-end: server register/JWT middleware green in E2E; mobile client auto-registers an anonymous device identity, stores JWT in AsyncStorage, drains outbox with Bearer <jwt> — CI + E2E green on 2b29bb2)
**Brand:** FitPulse in UI/bundle. Packages may use `@forma/*` internally.
**APK:** do not build until owner says so.

## On main

1. P0 offline-first — #75
2. P1 sync skeleton → Postgres → HttpOutbox → App drain — #76–#79
3. Today CTA + FitPulse copy + projection stub — #80
4. Sex-specific plans — #81
5. Sync hardening (strict RLS 003, bearer token, migration 004) + cloud E2E `verify-sync` — PR #83 + follow-ups
6. P2 per-user JWT (server) — `/api/v1/auth/register` (UUIDv5 identity), HS256 on node:crypto (30-day TTL), JWT middleware on `/api/v1/sync/*`: 401 without token, 403 user_mismatch, pull defaults to token subject. JWT supersedes SYNC_API_TOKEN when JWT_SECRET is set.
7. P2 client auth — `apps/mobile/src/features/auth/syncAuth.ts`: anonymous device subject (random, persisted), register → JWT, cached in AsyncStorage, re-register on expiry keeps the same subject → same user_id. `bootstrapOutboxDrain` wires token+user_id into HttpOutboxTransport; noop transport when offline or register fails. Tests: syncAuth.test.ts (register/persist/reuse/expired/offline).

## In flight

- `feat/p1-projection-writers` — content superseded by main; branch can be deleted.
- Next candidates: client-side pull (apply changes from /api/v1/sync/pull to local store); `exercise_record` Postgres projection (FK to session/revision); real login UI (email subject entry) when the owner wants accounts.

## P2 verification (cloud, no computer)

- `verify-sync.yml` E2E (JWT): register A/B with stable user_ids, 401 without token, 403 on user_mismatch, accepted/duplicate push, cross-user pull isolation (A=2/B=0), activity_credit under JWT — **green**.
- Monorepo CI: Install · Type-check · Test — **green** on 2b29bb2 (incl. auth.test.ts server suite and syncAuth.test.ts client suite).

## Debugging notes (phone-only workflow)

- CI/CI-E2E publish failure logs to the `ci-logs` branch (`ci-logs/<run_id>/`; ci.yml has `permissions: contents: write`). Captured: api_test.log, typecheck_core.log + inline in step summary.
- Known traps: pg_class column is `relforcerowsecurity`; device platform CHECK needed 'unknown'; template literals in pushed files must be re-checked for dropped brackets; relative import depth from workout/data to features/auth is `../../auth`.

## P1 status

| Item | Status |
|------|--------|
| DDL + RLS SQL (001–004) | yes |
| Sync API + Postgres stores | yes |
| Client outbox + App drain | yes |
| Projection service (noop / memory / postgres activity_credit) | yes |
| `activity_credit` writer E2E | green |
| `exercise_record` Postgres upsert | deferred (FK to session/revision) |
| Auth → RLS GUC | per-user JWT end-to-end (server + client) |
| Cloud E2E (verify-sync workflow) | green under JWT |

## Rules

1. No APK without owner go-ahead.
2. Brand is **FitPulse** — do not rename to Forma in UI/bundle.
3. No Google Fit — Health Connect only.
4. Preserve frozen catalog exercise ids 1–30.
5. Profile gate: `weightKg` finite > 0 — never invent default body mass.
