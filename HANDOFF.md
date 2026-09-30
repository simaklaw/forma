# HANDOFF — FitPulse

**Checkpoint:** 2026-09-30 (P2 per-user JWT auth done and cloud-verified: register/UUIDv5 identity, HS256, 401/403 user_mismatch, cross-user pull isolation; Monorepo CI + verify-sync E2E both green on 091fac0)
**Brand:** FitPulse in UI/bundle. Packages may use `@forma/*` internally.
**APK:** do not build until owner says so.

## On main

1. P0 offline-first — #75
2. P1 sync skeleton → Postgres → HttpOutbox → App drain — #76–#79
3. Today CTA + FitPulse copy + projection stub — #80
4. Sex-specific plans — #81
5. Sync hardening (strict RLS 003, bearer token, migration 004) + cloud E2E `verify-sync` — PR #83 + follow-ups
6. P2 per-user JWT — `/api/v1/auth/register` (UUIDv5 identity), HS256 sign/verify on node:crypto (30-day TTL), JWT middleware on `/api/v1/sync/*`: 401 without token, 403 user_mismatch on spoofed user_id, pull defaults to token subject. JWT supersedes SYNC_API_TOKEN when JWT_SECRET is set (legacy bearer kept as fallback). `scripts/setup-sync-token.sh` generates JWT_SECRET too.

## In flight

- `feat/p1-projection-writers` — content superseded by main; branch can be deleted.
- Next: client-side login in the mobile app (register/exchange auth_subject for JWT, store token, send Bearer in HttpOutboxTransport instead of static EXPO_PUBLIC_SYNC_API_TOKEN).

## P2 verification (cloud, no computer)

- `verify-sync.yml` E2E (JWT): register A/B with stable user_ids, 401 without token, 403 on user_mismatch, accepted/duplicate push, cross-user pull isolation (A=2/B=0), activity_credit under JWT — **green** (run on 091fac0).
- Monorepo CI: Install · Type-check · Test — **green** on 091fac0 (incl. new auth.test.ts suite).

## Debugging notes (phone-only workflow)

- CI/CI-E2E publish failure logs to the `ci-logs` branch (ci.yml now has `permissions: contents: write`; run logs land in `ci-logs/<run_id>/`).
- Known traps: pg_class column is `relforcerowsecurity`; device platform CHECK needed 'unknown'; template literals in pushed files must be re-checked for dropped brackets (auth.test.ts once shipped a broken interpolant — fixed).

## P1 status

| Item | Status |
|------|--------|
| DDL + RLS SQL (001–004) | yes |
| Sync API + Postgres stores | yes |
| Client outbox + App drain | yes |
| Projection service (noop / memory / postgres activity_credit) | yes |
| `activity_credit` writer E2E | green |
| `exercise_record` Postgres upsert | deferred (FK to session/revision) |
| Auth → RLS GUC | per-user JWT done (P2); strict RLS 003 + FORCE RLS |
| Cloud E2E (verify-sync workflow) | green under JWT |

## Rules

1. No APK without owner go-ahead.
2. Brand is **FitPulse** — do not rename to Forma in UI/bundle.
3. No Google Fit — Health Connect only.
4. Preserve frozen catalog exercise ids 1–30.
5. Profile gate: `weightKg` finite > 0 — never invent default body mass.
