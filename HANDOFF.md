# HANDOFF — FitPulse / Forma

**Checkpoint date:** 2026-09-26
**Active branch:** `fix/profile-gate-weightkg`
**Repo:** https://github.com/simaklaw/forma
**Product name:** FitPulse (mobile), monorepo still called Forma
**APK:** do **not** build until product backlog below is closed (owner decision).

This file is the **single source of truth** for handoff between AI agents and the human owner. Read it before changing code.

---

## Where we stopped (done recently)

### Equipment filter in catalog (2026-09-26)

- `inferEquipment` + chips «Всё оборудование / Резинки / Гантели / …» on `CatalogScreen`.
- Filter is pure offline (name + `wgerSearchTerm` + mode), no plan id changes.
- Tests: `catalogBrowser.test.ts` covers equipment filter.

### Stabilization after catalog/theme (2026-09-26)

- **Rest between exercises:** `complete_set` starts rest after the last set of a step when another step remains (`packages/workout-domain/src/reducer.ts` + test).
- Catalog filter extracted to `catalogBrowser.ts` with tests; `catalogIntegrity.test.ts` freezes exercise ids **1–30**.
- Outbox prune: `accepted` 14 days, `failed` 90 days.
- Removed unused root `build-android-apk.yml` (never executed by GitHub Actions).
- MuscleMap: `accessibilityLabel` for target muscles; `MUSCLE_LABELS` exported.

### Catalog browser + calves + light theme — Done 2026-09-26

See prior sections in git history. Branding: **FitPulse**.

---

## Next backlog

1. ~~Catalog home/gym~~ **Done**
2. ~~calves MuscleMap~~ **Done**
3. ~~Light theme~~ **Done**
4. ~~Equipment chips~~ **Done**
5. Exercise detail sheet (read-only, no auto session)
6. Favorites / recent exercises
7. PR → `main` when owner asks (do not force-push main)

### Deferred

- Health Connect (not Google Fit)
- APK only when owner says so
- Nutrition depth, coach LLM polish

---

## Architecture decision: Health Connect (NOT Google Fit)

| Topic | Decision |
|--------|----------|
| Google Fit API | **Rejected** |
| Health Connect | **Chosen** when health sync is in scope |

Offline-first: FitPulse SQLite/session is source of truth.

---

## Rules

1. Prefer branch `fix/profile-gate-weightkg` unless owner says otherwise.
2. **Do not ship APK** until owner says so.
3. **Do not add Google Fit**.
4. Preserve exercise numeric ids 1–30.
5. Update this HANDOFF when finishing a chunk.
