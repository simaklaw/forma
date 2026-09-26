# HANDOFF — FitPulse / Forma

**Checkpoint date:** 2026-09-26
**Active branch:** `feat/day-plan-override` (merge when CI green)
**Repo:** https://github.com/simaklaw/forma
**Product name:** FitPulse (mobile)
**APK:** do **not** build until owner says so.

---

## Where we stopped

### Day plan overrides (in progress / this branch)

- `dayPlanOverrides.ts` — AsyncStorage overrides per `mode` + `dayId` (ordered exercise ids)
- `resolveDayExercises` / `replaceDaySlot` / `clearDayOverride`
- `replaceTarget.ts` — in-memory target for catalog → slot replace flow
- Unit tests for resolve + home catalog lookup

**Still to wire on UI (next chunk if not in same PR):**
- WorkoutScreen: load overrides, apply `resolveDayExercises`, "Заменить" sets `replaceTarget` + navigate Каталог
- CatalogScreen / ExerciseDetailModal: banner + confirm replace via `replaceDaySlot`

### Already on main

- Session logger, PLAN_REVISION, catalog UX, Prettier gate, outbox prune

---

## Next backlog

1. Finish UI wiring for replace flow (if not merged fully)
2. Prettier `reducer.ts` + expand gate
3. Health Connect (not Google Fit)
4. ESLint monorepo
5. APK only when owner says so

---

## Rules

1. No APK without owner go-ahead.
2. No Google Fit.
3. Preserve frozen catalog exercise ids **1–30** (overrides reference ids, do not renumber).
4. Update this file after each chunk.
5. Bump `PLAN_REVISION` when default static plans change.
