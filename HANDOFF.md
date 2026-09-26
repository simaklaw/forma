# HANDOFF — FitPulse / Forma

**Checkpoint date:** 2026-09-26
**Active branch:** `fix/profile-gate-weightkg` (also merged to `main` via PR #37; continue on this branch or `main`)
**Repo:** https://github.com/simaklaw/forma
**Product name:** FitPulse (mobile)
**APK:** do **not** build until owner says so.

---

## Where we stopped (done recently)

### Exercise detail + favorites (2026-09-26)

- `ExerciseDetailModal` — read-only: stats, note, MuscleMap, wger photo, video placeholder, **no** start-session CTA.
- `exerciseFavorites.ts` — AsyncStorage favorites + recent (cap 12); key format `mode:id`.
- Catalog: tap card → detail; ★ filter chip; star on favorited rows.
- Tests: `exerciseFavorites.test.ts` (key parse).

### Earlier same day

- Equipment filter chips, catalog browser, calves, light theme, rest between exercises, outbox prune, integrity tests.
- Squash-merged to `main` as PR **#37** (`36cac92`).

---

## Next backlog

1. ~~Catalog / calves / light / equipment~~ **Done**
2. ~~Exercise detail (read-only)~~ **Done**
3. ~~Favorites~~ **Done** (recent stored; UI focuses on favorites filter)
4. Optional: surface **recent** row on catalog header
5. Optional: wire generated technique video URLs when assets exist
6. Health Connect module (not Google Fit) when health sync is in scope
7. APK only when owner says so

---

## Architecture: Health Connect only

Google Fit **rejected**. Health Connect when implementing health sync. Offline-first session remains source of truth.

---

## Rules

1. Prefer `fix/profile-gate-weightkg` or fast-forward from `main`.
2. No APK without owner go-ahead.
3. No Google Fit.
4. Preserve exercise ids **1–30**.
5. Update this file after each chunk.
