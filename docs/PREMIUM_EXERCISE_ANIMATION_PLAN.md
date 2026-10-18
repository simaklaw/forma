# FitPulse Premium 2D Exercise Animation Library — Plan

Status: inventory report/generator added; reusable vector-rig pilot integrated for three exercise IDs; CI and on-device review are still pending. This branch is intentionally separate from `main`.

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

### Phase 1 — art/rig proof of concept

1. Create one original neutral rig with reusable torso, head, upper/lower limbs, hands/feet, and joint pivots; add male/female visual skins sharing the same motion rig where practical.
2. Produce three representative animations first: bodyweight squat, push-up, and dumbbell shoulder press (or the closest matching catalog exercises).
3. Deliver each as a small set of clean keyframes plus a looping preview format selected after a React Native/offline compatibility check. Prefer an asset format with reliable native playback and predictable bundle size; do not assume Rive/Lottie/Spine support without verifying current dependencies.
4. Review anatomy, equipment, timing, visual quality, and dark/light theme contrast on a phone-sized screen before scaling up.

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
- Added a per-exercise [coverage registry](./EXERCISE_ANIMATION_COVERAGE.json): 62 workout-plan entries plus 163 imported-library entries (225 total), with separate male/female status and legacy-media-rights status. Only three entries are prototypes; 222 are explicitly marked not started.
- Added CI validation that fails if the committed coverage registry is stale after a catalog change.
- Added a manual [Android pilot checklist](./EXERCISE_RIG_PILOT_DEVICE_CHECKLIST.md).
- Added an original SVG-based vector rig with pilot movements: squat (ID 13), push-up (ID 10), and seated dumbbell press (ID 5); includes male/female skins, footwear/apparel details, offline rendering and pause while hidden/backgrounded.
- Added pose-model unit tests for ID mapping, continuous loops, finite coordinates, ground contact and movement direction.
- Integrated the pilot into the workout sheet and catalog detail modal only for the three explicitly mapped IDs; all other exercises retain their current media fallback.
- Added explicit legacy-media rights notes. Existing third-party GIFs are not assumed to be free to redistribute; excluded wrong matches are not considered valid coverage.
- No changes have been made to main.
## Immediate next implementation task

Run CI and fix any type/test failures. Then review the three animations on an Android-sized screen, correct pose/anatomy and movement timing, and verify both profile variants. Do not generate hundreds of animations before the rig and pilot pass review.
