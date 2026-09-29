# HANDOFF — FitPulse / Forma

**Checkpoint:** 2026-09-29
**APK:** do not build until owner says so.

## Open PRs (CI green where noted)

1. [#64](https://github.com/simaklaw/forma/pull/64) `feat/home-mode-media-coach` — home default, exercise media, coach keywords
2. [#66](https://github.com/simaklaw/forma/pull/66) `feat/sqlite-migrations` — `PRAGMA user_version` runner; CI **green**
3. [#65](https://github.com/simaklaw/forma/pull/65) `fix/profile-gate-weightkg` — combined older bundle (overlap with 64/66)

Prefer merging **66 then 64** (or squash 65 only if it is the intended single landing). Do not merge both 65 and 64/66.

## Next

1. Merge #66 (sqlite runner + legacy stamp for existing DBs)
2. Merge #64 (home/media/coach)
3. Next schema change can be `weight_snapshot_kg` as migration **v2** — not before merge
4. Health: Health Connect / Samsung Health — **not** Google Fit
5. APK only when owner says so

## Rules

1. No APK without owner go-ahead.
2. No Google Fit.
3. Never commit API keys.
4. Preserve frozen catalog exercise ids 1–30.
