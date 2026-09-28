# HANDOFF — FitPulse / Forma

**Checkpoint date:** 2026-09-28
**Active branch:** `fix/profile-gate-weightkg`
**Repo:** https://github.com/simaklaw/forma
**Product name:** FitPulse (mobile), monorepo still called Forma
**APK:** do **not** build until product backlog below is closed (owner decision).

This file is the **single source of truth** for handoff between AI agents and the human owner. Read it before changing code.

---

## Where we stopped (done recently)

### Catalog browser + MuscleMap follow-up (2026-09-26)

- Added `apps/mobile/src/features/workout/CatalogScreen.tsx`: offline exercise browser with home/gym mode, text search, muscle chips, load metadata, and empty state.
- Added a `Каталог` bottom-tab route and a shortcut from the Workout header; no network dependency was introduced.
- Added `calves` to `MuscleKey`, labels, marker position, and the gym standing calf-raise exercise. Existing numeric exercise ids remain unchanged.
- Rolled dynamic theme styles into the catalog, onboarding, Progress, Coach, Nutrition, and shared profile/nutrition cards; onboarding branding now says FitPulse.
- Validation: mobile TypeScript check passed; 19 Jest suites / 104 tests passed; `git diff --check` passed.
- The previously identified legacy theme surfaces are addressed in the Light theme completion chunk below.

### Light theme completion (2026-09-26)

- Migrated `ExerciseSheet`, `BottomSheet`, `ExerciseVideo`, `AddFoodSheet`, `MuscleMap`, `WorkoutCoachCard`, `WorkoutErrorBoundary`, `ProtocolBanner`, and `WeightChart` to `useThemeColors()`.
- Removed remaining `FORMA` UI labels from the touched workout/metabolism surfaces. The only intentional hardcoded black is the fullscreen video canvas.
- Validation: mobile typecheck passed; 19 Jest suites / 104 tests passed; lint has 0 errors (repository-wide Prettier warnings only); `git diff --check` passed.

### Local exercise media (2026-09-28)

- Copied the existing web exercise media into `apps/mobile/assets/exercises/`: 12 JPG thumbnails and 12 MP4 demos. No generated or external copyrighted media was added.
- Added `apps/mobile/src/features/workout/exerciseMedia.ts` with explicit Metro-safe `require()` maps for thumbnails and videos.
- Added optional `mediaKey` to `ExerciseDef` and mapped all 27 home-plan exercises to an existing local movement demo; gym plans remain unchanged.
- Added thumbnails to the home workout exercise list and passed local videos into the existing `ExerciseVideo` component.
- Added `ExerciseSheet.onClose` wiring so the selected exercise unmounts when the sheet closes; this prevents hidden exercise videos from continuing to autoplay in the background.
- Validation: mobile typecheck passed; 19 Jest suites / 104 tests passed; `git diff --check` passed.

### Catalog expansion (wger-aligned, offline-first)

- `apps/mobile/src/features/workout/gymPlan.ts` — 8 gym days (push/pull/legs/full/upper/lower/shoulders/arms), more exercises; **ids 1–30 preserved** for logs/PRs; new ids 31+.
- `apps/mobile/src/features/workout/bodyweightPlan.ts` — expanded home days + `full-home`.
- Photos: existing `wgerSearchTerm` + `useExerciseReference` + `WgerExerciseService` (stale-while-revalidate, AsyncStorage). No live-only catalog dependency.
- Commits on this branch (latest catalog work):
  - `99554e77` — expand gym from wger vocabulary
  - `50dd01b0` — expand home bodyweight
  - `b6a450dc` — MuscleKey fix (no invalid `calves` in gymPlan)

### Already in the app (do not regress)

- Event-sourced session layer under `apps/mobile/src/features/workout/data/` + `session/`
- Rest timer, sequential steps, ExerciseSheet, MuscleMap
- Theme toggle exists in places (dark default); **not** fully rolled out to all screens
- Branding direction: **FitPulse**, not "forma" in UI chrome

---

## Next backlog (owner-requested, in order)

1. ~~**Catalog browser screen** — list/search exercises with **filter home | gym** (and ideally category chips). Wire from Workout tab / Today.~~ **Done 2026-09-26.**
2. ~~**`calves` in MuscleMap** — add `calves` to `MuscleKey`, labels, positions in `apps/mobile/src/components/MuscleMap.tsx`; then use `targetMuscles: ['calves']` where appropriate (e.g. calf raises).~~ **Done 2026-09-26.**
3. ~~**Light theme on remaining screens** — sporty light palette, same toggle; no pure gray Material defaults; keep FitPulse identity.~~ **Done 2026-09-26.**

### Next implementation chunks from owner-provided Grok review
- Make the home/bodyweight mode the default while preserving the gym code path; decide explicitly whether existing persisted gym preferences should be preserved or migrated.
- Add targeted coach keyword branches for muscle gain and belly-fat questions with regression tests.
- Replace the SQLite `CREATE TABLE IF NOT EXISTS` bootstrap with a `PRAGMA user_version` migration runner and tests before adding future schema columns.

### Deferred / later (not blocking APK when backlog 1–3 done)

- More plans, Russian cues, richer video placeholders (generated, not copyrighted stock)
- Nutrition depth (Open Food Facts already in core)
- Coach LLM polish

---

## Architecture decision: Health Connect (NOT Google Fit)

**Owner decision (2026-09-25): integrate Android health data via Health Connect only. Do not implement Google Fit API.**

| Topic | Decision |
|--------|----------|
| Google Fit API | **Rejected** — deprecated / sunset path; cloud-centric; would require rewrite |
| Health Connect | **Chosen** — on-device hub (Android 14+ system-level), privacy, offline, one link to Samsung Health / Fitbit / Strava / Garmin ecosystems |
| Scope for now | **Document + design only until backlog 1–3 done.** When implementing: read/write workouts & steps/weight as product needs; granular permissions; no cloud Google Fit bridge |

Implementation notes for a future agent:

- Prefer official Android Health Connect APIs / well-maintained RN/Expo modules that target **Health Connect**, not the old Fit client.
- Keep offline-first: FitPulse SQLite/session remains source of truth for in-app sessions; Health Connect is import/export/sync edge.
- iOS (if later): HealthKit is the parallel, not Google Fit.

---

## Stack snapshot (mobile)

- Monorepo: pnpm + turbo
- App: `apps/mobile` (Expo / React Native)
- Catalog entry: `catalog.ts` → `GYM_PLAN` / `WORKOUT_PLAN` (home)
- Domain: `@forma/workout-domain`, `@forma/core`
- CI: GitHub Actions; EAS for native builds (see README)

---

## Rules for any agent continuing work

1. Work on **`fix/profile-gate-weightkg`** unless owner says otherwise; do not force-push main without explicit ask.
2. **Do not ship APK** until owner says the plan/backlog is complete.
3. **Do not add Google Fit** integration.
4. Prefer offline-first; expand static catalog + optional wger photo enrichment, not mandatory network for workouts.
5. Preserve exercise **numeric ids** already used in logs when editing plans.
6. When finishing a chunk, update this **HANDOFF.md** "Where we stopped" and check off backlog items.

---

## Prompt to resume with Grok (copy-paste)

```
Продолжаем FitPulse (simaklaw/forma), ветка fix/profile-gate-weightkg.
Сначала прочитай HANDOFF.md в корне репозитория.
Следующие задачи по порядку: (1) экран-браузер «Каталог» фильтр дом/зал,
(2) calves в MuscleMap, (3) light theme на остальных экранах.
Google Fit не трогаем — только Health Connect когда дойдём до health sync.
APK не собираем, пока не скажу.
```

## Prompt for another AI agent (copy-paste)

```
You are continuing the FitPulse mobile app in https://github.com/simaklaw/forma
Branch: fix/profile-gate-weightkg
Read HANDOFF.md at repo root first — it is authoritative.
Next: Catalog browser (home/gym filter), then calves in MuscleMap,
then light theme on remaining screens.
Do NOT integrate Google Fit; Health Connect only when health sync is in scope.
Do NOT build APK until the human says so.
Preserve exercise ids 1–30 in gym/home plans.
Update HANDOFF.md when you finish a chunk.
```

---

## Owner pause

Owner may build/test with another agent, then return. Resume from **Next backlog** and this file — not from chat memory alone.
