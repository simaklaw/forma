# HANDOFF — FitPulse

**Checkpoint:** 2026-09-30 (P2 branch complete — ready to merge)
**Brand:** FitPulse in UI/bundle.
**APK:** do not build until owner says so.

## Branch `feat/p2-push-enrichment-and-soft-pr` (7 commits)

1. Push enrichment — projection in outbox
2. verify-sync — projection / PR / exercise_record asserts
3. Soft PR (`005_pr_observation`)
4. Session materialize + promote (`006` seed)
5. session_step / session_set from setLogs
6. Profile login — email subject → JWT
7. Health Connect — last successful export timestamp on card

## Health Connect (already on main + this polish)

- Write workouts + active kcal + weight (not Google Fit)
- Wired from ActiveSessionController + logWeight
- Card shows status + **last export time**

## Next after merge

1. Run CI / verify-sync on the PR
2. Optional OIDC / password later
3. APK only when owner says so

## Rules

1. No APK without owner go-ahead.
2. Brand is **FitPulse**.
3. No Google Fit — Health Connect only.
4. Frozen catalog exercise ids 1–30.
5. Profile gate: weightKg finite > 0.
