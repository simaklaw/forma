# HANDOFF — FitPulse / Forma

**Checkpoint:** 2026-09-29
**APK:** do not build until owner says so.

## On main

1. SQLite migrations v1–v2 + `weight_snapshot_kg` write (#66–#68)
2. Home mode, exercise media, coach keywords (#64)
3. Nutrition ring polish (#69)
4. Health Connect → Samsung Health path (#71)

## In flight

- `feat/weight-hc-on-profile-update` — HC weight export on `logWeight` **and** `updateProfile({ weight })`; invalid weight no-op

## Next

1. Merge weight→HC profile update when CI green
2. Product polish candidates: Progress screen, onboarding gate UX, coach chips
3. APK only when owner says so

## Rules

1. No APK without owner go-ahead.
2. No Google Fit — Health Connect only (Samsung Health syncs from HC).
3. Never commit API keys.
4. Preserve frozen catalog exercise ids 1–30.
5. Profile gate: `weightKg` finite > 0 — never invent default body mass.
