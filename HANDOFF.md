# HANDOFF — FitPulse / Forma

**Checkpoint:** 2026-09-29
**APK:** do not build until owner says so.

## On main

1. SQLite migrations v1–v2 + `weight_snapshot_kg` write path (#66–#68)
2. Home mode, exercise media, coach keywords (#64)

## In flight

- `feat/nutrition-ring-polish` — CalorieRing %/budget/a11y, MacroBar a11y, NutritionScreen hero chips (цель / тренировка / бюджет)

## Next

1. Merge nutrition polish when CI green
2. Health Connect / Samsung Health polish (`features/health`)
3. APK only when owner says so

## Rules

1. No APK without owner go-ahead.
2. No Google Fit.
3. Never commit API keys.
4. Preserve frozen catalog exercise ids 1–30.
5. Profile gate: `weightKg` finite > 0 — never invent default body mass.
