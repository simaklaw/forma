# HANDOFF — FitPulse / Forma

**Checkpoint:** 2026-09-29
**APK:** do not build until owner says so.

## On main (just merged)

1. [#66](https://github.com/simaklaw/forma/pull/66) SQLite `PRAGMA user_version` migration runner + legacy stamp
2. [#64](https://github.com/simaklaw/forma/pull/64) home mode default, exercise media (jpg/mp4), coach keywords

Closed as overlap: [#65](https://github.com/simaklaw/forma/pull/65).

## In flight

- `feat/weight-snapshot-v2` — migration **v2**: `ALTER TABLE workout_session ADD COLUMN weight_snapshot_kg REAL`
  - Column only for now (denormalized for MET/burn queries). Write path not wired yet.

## Next

1. Merge weight_snapshot v2 when CI green
2. Optionally write `weight_snapshot_kg` from profile weight on `commitSessionChange`
3. Health: Health Connect / Samsung Health — **not** Google Fit
4. APK only when owner says so

## Rules

1. No APK without owner go-ahead.
2. No Google Fit.
3. Never commit API keys.
4. Preserve frozen catalog exercise ids 1–30.
