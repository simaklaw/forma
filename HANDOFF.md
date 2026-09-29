# HANDOFF — FitPulse / Forma

**Checkpoint:** 2026-09-29
**APK:** do not build until owner says so.

## On main

1. SQLite migrations v1–v2 + weight snapshot (#66–#68)
2. Home mode, exercise media, coach keywords (#64)
3. Nutrition ring (#69), Health Connect / Samsung (#71–#72)
4. Progress screen polish (#73)

## In flight

- `feat/coach-onboarding-polish` — horizontal coach chips + a11y; onboarding ScrollView/KAV; ProfileForm labels

## Next

1. Merge coach/onboarding polish when CI green
2. APK only when owner says so

## Rules

1. No APK without owner go-ahead.
2. No Google Fit — Health Connect only (Samsung Health syncs from HC).
3. Never commit API keys.
4. Preserve frozen catalog exercise ids 1–30.
5. Profile gate: `weightKg` finite > 0 — never invent default body mass.
