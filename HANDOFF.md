# HANDOFF — FitPulse / Forma

**Checkpoint:** 2026-09-29
**APK:** do not build until owner says so.

## On main

1. SQLite migrations v1–v2 + `weight_snapshot_kg` write (#66–#68)
2. Home mode, exercise media, coach keywords (#64)

## Open (merge later)

- [#69](https://github.com/simaklaw/forma/pull/69) nutrition ring polish — owner will merge after health

## In flight

- `feat/health-connect-samsung` — Health Connect → Samsung Health path (not Google Fit):
  - ExerciseSession type STRENGTH_TRAINING (80)
  - WRITE_WEIGHT permission
  - Card copy + open Health Connect settings
  - denied status via getGrantedPermissions when available

## Next

1. CI + merge health-connect-samsung
2. Merge #69 nutrition polish
3. Optional: push profile weight to HC on logWeight
4. APK only when owner says so

## Rules

1. No APK without owner go-ahead.
2. No Google Fit — Health Connect only (Samsung Health syncs from HC).
3. Never commit API keys.
4. Preserve frozen catalog exercise ids 1–30.
5. Profile gate: `weightKg` finite > 0 — never invent default body mass.
