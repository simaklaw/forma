# FitPulse Premium 2D Exercise Animation Library — Plan

Status: the first SVG rig attempt was rejected after physical-device testing. Its UI integration has been removed. All 225 IDs are marked not-started for newly authored, exercise-accurate animation. This branch now restores the existing media path, resolves exact local posters where available, removes the fake-player treatment from missing-media cards, and guards against stale sessions from another workout day. These fixes still require a fresh CI run and Android retest; `main` remains unchanged.


## Device review — corrective actions (2026-10-19)

The first test APK did not meet the intended visual quality. The SVG sketch looked schematic rather than premium, missing-media states looked like a broken black video player, and the workout sheet could show a stale “next exercise” from another day. The SVG component was removed from the two user-facing exercise screens. A strict local-poster resolver now prefers an imported exercise's own bundled frame, then an exact plan media-key thumbnail, then an exact slug match; it does not fuzzy-match similar names. Missing animation remains honestly labeled as unavailable instead of showing a false play control.

The sheet now ignores a resumable session when its template belongs to a different dayId. This is a targeted safeguard, not proof that the entire session flow is now correct. A fresh CI run and on-device retest are still required. Do not merge the draft until these are green and the animation asset/licensing plan is settled.

## Goal

Build an original, coherent, premium 2D exercise-animation system for FitPulse that works offline, supports the existing male/female training modes, and reuses a small number of rigs and motion templates. Avoid copying another app's artwork or animation frames; use references only to establish broad quality/style direction.

## Repository snapshot

Audited `main` at commit `503e7b9a8905e80ff876721a15460db863b5f18c` (2026-10-18).

- The mobile exercise library contains **96 exercise folders** under `apps/mobile/assets/exercise-library`.
- Those folders contain **192 JPG frames** (typically `0.jpg` and `1.jpg` per exercise).
- There are **61 locally bundled dataset GIFs** represented by `apps/mobile/src/features/workout/exerciseDatasetAssets.generated.ts`.
- The app already has a media abstraction in `apps/mobile/src/features/workout/ExerciseMediaService.ts`, plus generated GIF/video manifests. This means we should extend or adapt existing media resolution rather than build a competing system.
- Workout plans are assembled from `bodyweightPlan.ts`, `gymPlan.ts`, `sexPlan.ts`, and imported-library metadata in `importedExerciseBridge.ts`. The full animation scope must be derived from these runtime catalog sources and the imported-library manifest, not inferred from image-folder count alone.
- Existing media includes third-party dataset material. Before shipping any inherited assets, verify the source license and attribution requirements. The new character/rig artwork should be original.

## Product and art direction

- Premium sports-instruction aesthetic: polished vector-like 2D anatomy, consistent body proportions, readable silhouettes, deliberate lighting/shading, restrained detail, clean high-contrast stage, no visual clutter.
- Gender mode: male and female character variants, selected from the existing profile/training mode; exercise mechanics and instructions remain equivalent unless the exercise itself requires a different variant. Avoid gender stereotypes in body shape or performance.
- Exercise demonstrations must be mechanically legible: start pose, end pose, movement path, contact points, equipment, and joint positions should be clear. A loop that merely looks animated but teaches incorrect form is not acceptable.
- Background and colors must work with FitPulse dark and light themes. Keep the exercise stage visually calm and avoid embedding important labels into the art.
- Offline-first: all approved baseline animations should be bundled or available as local assets. Remote media may be an optional update path, never a requirement for viewing core exercise instructions.


## Media rights rule

- Treat the imported exercise metadata and third-party illustration/GIF files as separate legal items.
- The `hasaneyldrm/exercises-dataset` repository's [LICENSE](https://github.com/hasaneyldrm/exercises-dataset/blob/main/LICENSE) explicitly excludes its `images/` and `videos/` media from the MIT license. Its [NOTICE](https://github.com/hasaneyldrm/exercises-dataset/blob/main/NOTICE.md) identifies the media as © Gym visual, restricts it to 180×180, requires `© Gym visual — https://gymvisual.com/` attribution and refers reuse to Gym visual's terms. Do not assume these GIFs can be redistributed in FitPulse APKs without checking/obtaining the required license.
- The `yuhonas/free-exercise-db` source declares Unlicense/Public Domain in its [license file](https://github.com/yuhonas/free-exercise-db/blob/main/LICENSE.md); keep provenance metadata rather than flattening all inherited asset sources to one license.
- All newly generated character art, rig pieces, poses and animation curves must be original. Do not trace/reference-copy third-party frames.

## Proposed technical approach

### Phase 0 — complete inventory and rights audit

1. Extract the canonical exercise ID/name list from both home and gym plans, sex-specific plan variants, and imported exercise library.
2. Join every exercise to current image/GIF/video assets and record coverage, duplicates, missing matches, ambiguous matches, source/license, equipment, and movement family.
3. Confirm how the current UI selects and displays media in `ExerciseSheet`, `ExerciseDetailModal`, `ImportedLibraryPanel`, `useExerciseListThumbs`, and `ExerciseMediaService`.
4. Produce a coverage matrix and a prioritized list of representative motions. Do not replace any existing assets during this phase.

### Phase 1 — visual-system gate (previous SVG prototype rejected)

1. Use the supplied RepDB preview only to define a quality target; do not ship its preview animations as production assets. The uploaded ZIP contains a 22-exercise sample, not a complete library, and its included terms restrict the preview to evaluation/non-commercial use.
2. Before any full-dataset integration, acquire and verify the commercial licence covering the selected character(s), animation files, app distribution, caching, and offline playback. If not purchased, use original commissioned/generated assets or a dataset with a compatible commercial licence.
3. Select a format compatible with the current Expo/React Native Android build; keep every approved animation local/offline, transparent, sharp at phone scale, and matched to the exact equipment and movement.
4. Start with a quality-reviewed set of representative motions, install a test build on a real phone, and only then expand through an explicit per-exercise media manifest. A family label is not permission to reuse an animation when its mechanics differ.

### Phase 2 — animation taxonomy and reusable motion library

Group exercises by motion family instead of drawing every exercise independently:
- squat / hinge / lunge;
- horizontal push / vertical push;
- horizontal pull / vertical pull;
- curl / extension / raise;
- plank / bridge / floor core;
- rotation / anti-rotation;
- jump / locomotion / cardio;
- mobility / stretch / isometric hold;
- equipment-specific variants (dumbbells, barbell, cable, resistance band, bench, machine).

Reuse rigs and motion blocks only where biomechanics genuinely match. Exercise-specific corrections and equipment interactions remain explicit.

### Phase 3 — catalog mapping and offline integration

1. Add a typed animation manifest keyed by stable exercise/library IDs, with explicit male/female variants, asset paths, fallback poster, motion family, source/license, and review status.
2. Keep generated files generated from a deterministic script; do not hand-edit generated manifests.
3. Extend the existing media service with a backward-compatible local animation resolution path. Preserve current image/video fallbacks until new assets are validated.
4. Add tests for complete ID coverage, missing-file detection, gender-variant fallback, offline resolution, unknown IDs, and correct selection in list/detail views.
5. Check bundle size and loading performance; use shared assets and avoid bundling redundant copies.

### Phase 4 — rollout by quality gates

- Pilot with 3 exercises, then 10, then one complete motion family.
- Do not claim full coverage until every canonical catalog ID has either an approved original animation or a clearly documented fallback.
- Run mobile type-check, relevant tests, asset-integrity checks, and Android APK smoke test.
- Validate on-device: exercise list scrolling, detail sheet close/open, correct animation per exercise, no black placeholder frames, gender mode, dark/light mode, and airplane-mode playback.

## Acceptance criteria

- Every exercise ID in the canonical scope appears in the inventory report.
- Each mapped animation matches the actual exercise and equipment; no generic animation is silently substituted for a different movement.
- Male/female mode selection is deterministic and respects the user's profile settings.
- Core approved animations play with network disabled.
- No blank/black media frames; image poster fallback remains available.
- Animations and manifests do not break existing catalog/program/session behavior.
- License/attribution is recorded for every non-original asset; new art is original.
- CI passes and the APK is verified before any release.
- `main` is not changed without explicit user approval. Work proceeds on `feat/premium-exercise-animation-library` and should be proposed as a PR for review.

## Work completed on the feature branch

- Added a reproducible inventory generator and [full inventory report](./EXERCISE_ANIMATION_INVENTORY.md).
- Added a per-exercise [coverage registry](./EXERCISE_ANIMATION_COVERAGE.json): 62 workout-plan entries plus 163 imported-library entries (225 total), with separate male/female status and legacy-media-rights status. All 225 entries are currently marked not-started for new animation. The previous three SVG prototypes were rejected and are no longer counted as coverage.
- Added 25 preliminary motion-family candidates for all 225 entries, with classification rule/confidence and review status. Only three records require manual classification because exercise instructions, muscle metadata, or equipment information conflict; those are explicitly blocked from final mapping until corrected.
- Added heuristic motion-family candidates to all 225 entries: 22 preliminary groups, with classification confidence/rule and manual-review status. Fifteen entries currently fall back to manual classification; all candidates remain unreviewed and do not count as animation coverage.
- Added CI validation that fails if the committed coverage registry is stale after a catalog change.
- Added a manual [Android pilot checklist](./EXERCISE_RIG_PILOT_DEVICE_CHECKLIST.md).
- The first SVG-based vector rig (squat ID 13, push-up ID 10, seated dumbbell press ID 5) failed visual acceptance and was removed from both exercise-detail surfaces; those three records are no longer counted as prototypes or coverage.
- Removed the rejected SVG rig and the tests that only validated its schematic pose model.
- Added a local poster resolver for stable imported IDs, explicit bundled media keys and exact exercise-slug matches; similar names are never fuzzy-matched.
- Added explicit legacy-media rights notes. Existing third-party GIFs are not assumed to be free to redistribute; excluded wrong matches are not considered valid coverage.
- No changes have been made to main.
## Immediate next implementation task

- The generator creates the full inventory and coverage registry; CI checks that the committed 225-ID registry stays byte-for-byte synchronized and asserts key candidate assignments plus the three manual-review blockers. The updated coverage now records zero approved new animations; a fresh CI run is pending.
- A previous Android APK was successfully packaged, but the user rejected its on-device visual result. Do not reuse that APK as a quality sign-off; the fixes on this branch must be included in a new build.
- Run the newly queued CI on the updated branch. If green, produce a fresh Android APK and retest the media fallback plus the different-day session guard on the phone. Do not expand into full animation production until the user approves a licensed dataset or original-asset route.
- Do not generate hundreds of animations before the rig and pilot pass review.
