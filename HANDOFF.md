# HANDOFF — FitPulse / Forma

**Checkpoint date:** 2026-09-26
**Active branch:** `main` (after workout-screen-overrides merge)
**Repo:** https://github.com/simaklaw/forma
**Product name:** FitPulse (mobile)
**APK:** do **not** build until owner says so.

---

## Where we stopped

### Day plan overrides — UI wired

- `dayPlanOverrides.ts` + tests (on main)
- Catalog replace banner + detail CTA (on main)
- **WorkoutScreen:** `resolveDayExercises`, long-press → replace target + Каталог, «Сбросить замены»
- Sessions use `effectiveExercises`

### Also on main

- Session logger, PLAN_REVISION, catalog UX, Prettier gate, outbox prune

---

## Next backlog

1. Prettier `reducer.ts` + expand gate
2. Health Connect (not Google Fit)
3. ESLint monorepo
4. Optional: generated technique videos
5. APK only when owner says so

---

## Rules

1. No APK without owner go-ahead.
2. No Google Fit.
3. Preserve frozen catalog exercise ids **1–30** (overrides reference ids).
4. Update this file after each chunk.
5. Bump `PLAN_REVISION` when default static plans change.
