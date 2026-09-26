# HANDOFF — FitPulse / Forma

**Checkpoint date:** 2026-09-26
**Active branch:** `feat/catalog-detail-favorites` (or `main` after merge)
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

### Merged earlier: PR #37 → main

Catalog home/gym, equipment chips, calves, light theme, rest between exercises, integrity tests.

---

## Next backlog

1. Optional: UI row for **recent** exercises on catalog header
2. Optional: real technique video assets (generated, not copyrighted stock)
3. Health Connect module (not Google Fit) when health sync is in scope
4. APK only when owner says so

---

## Architecture: Health Connect only

Google Fit **rejected**. Offline-first session remains source of truth.

---

## Rules

1. No APK without owner go-ahead.
2. No Google Fit.
3. Preserve exercise ids **1–30**.
4. Update this file after each chunk.
