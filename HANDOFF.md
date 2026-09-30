# HANDOFF — FitPulse

**Checkpoint:** 2026-09-30 (P2 projections wired — soft PR + materialize)
**Brand:** FitPulse in UI/bundle.
**APK:** do not build until owner says so.

## Branch `feat/p2-push-enrichment-and-soft-pr`

Push path after accepted op:
1. `pr_observation` (soft max_load from setLogs)
2. `workout_session` + steps/sets materialize (006 seed)
3. promote → `exercise_record`
4. `activity_credit` (terminal only)

Also: login UI, HC last export, review hardening (auth gate, timeout, clearSyncAccount).

## Next after merge

1. Green CI / verify-sync (migrations 001–006)
2. Optional OIDC later
3. APK only when owner says so

## Rules

1. No APK without owner go-ahead.
2. Brand is **FitPulse**.
3. No Google Fit — Health Connect only.
4. Frozen catalog exercise ids 1–30.
5. Profile gate: weightKg finite > 0.
