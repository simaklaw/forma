# HANDOFF — FitPulse / Forma

**Checkpoint:** 2026-09-27
**Branch in flight:** `feat/progress-names-hc-weight`
**APK:** do not build until owner says so.

## On main

- Health Connect workouts, nutrition burn, catalog counts, progress polish

## In flight

- Progress PR list uses `allExerciseNames()`
- Burn MET uses exercise names for better mapping
- HC `writeWeightKg` on `logWeight` when export enabled

## Next

1. Merge when CI green
2. APK only on owner request

## Rules

1. No APK without owner go-ahead.
2. No Google Fit.
3. Never commit API keys.
