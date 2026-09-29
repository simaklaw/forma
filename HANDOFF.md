# HANDOFF — FitPulse / Forma

**Checkpoint:** 2026-09-29
**APK:** do not build until owner says so.

## On main

1. SQLite migrations v1–v2 + `weight_snapshot_kg` write (#66–#68)
2. Home mode, exercise media, coach keywords (#64)
3. Nutrition ring polish (#69)
4. Health Connect → Samsung Health (#71)
5. HC weight on logWeight + updateProfile (#72)

## In flight

- `feat/progress-screen-polish` — Progress subtitle summary, a11y on stats, today bar highlight

## Next

1. Merge progress polish when CI green
2. Onboarding / coach chips polish
3. APK only when owner says so

## Rules

1. No APK without owner go-ahead.
2. No Google Fit — Health Connect only (Samsung Health syncs from HC).
3. Never commit API keys.
4. Preserve frozen catalog exercise ids 1–30.
5. Profile gate: `weightKg` finite > 0 — never invent default body mass.
