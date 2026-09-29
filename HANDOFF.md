# HANDOFF — FitPulse / Forma

**Checkpoint:** 2026-09-29
**APK:** do not build until owner says so.

## On main

1. [#66](https://github.com/simaklaw/forma/pull/66) SQLite `PRAGMA user_version` migration runner + legacy stamp
2. [#64](https://github.com/simaklaw/forma/pull/64) home mode default, exercise media (jpg/mp4), coach keywords
3. [#67](https://github.com/simaklaw/forma/pull/67) migration **v2** `weight_snapshot_kg` column

## In flight

- `feat/weight-snapshot-write` — write `weight_snapshot_kg` from `session.weightKgSnapshot` on commit; no invented 70 kg in HC burn estimate

## Next

1. Merge weight-snapshot write when CI green
2. Nutrition ring polish (КБЖУ) + gym/home UX
3. Health Connect / Samsung Health — already scaffolded under `features/health`
4. APK only when owner says so

## Rules

1. No APK without owner go-ahead.
2. No Google Fit.
3. Never commit API keys.
4. Preserve frozen catalog exercise ids 1–30.
5. Profile gate: `weightKg` finite > 0 — never invent default body mass.
