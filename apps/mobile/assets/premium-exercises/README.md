# FitPulse original premium 2D exercise animation library

**Current status (2026-11-16): inventory and CI hardening only.** This directory contains this README only. It does not contain an accepted original 2D rig, animation frames, GIFs, or a runtime animation manifest.

## Historical five-motion RepDB pilot (not integrated)

Earlier revisions described a five-motion preview:
- Pull-up (home-plan ID 11)
- Bench leg pull-in
- Dumbbell biceps curl
- Front squat, clean grip
- One-arm kettlebell row

That pilot was developed on the old `fix/pr178-rebased-main` line. PR [#180](https://github.com/simaklaw/forma/pull/180) was closed without merging on 2026-11-08. PR [#303](https://github.com/simaklaw/forma/pull/303) transferred non-premium workout/player/session stabilization to current `main`, but explicitly excluded `exercisePremiumMapping`, `exercisePremiumMedia`, `premiumGifAsset` wiring, and build-time GIF generation.

The five RepDB GIFs are **not bundled by this directory**. Verify exact permission for conversion, app distribution, offline embedding, and commercial use before using any preview media. Third-party preview clips do not count as original FitPulse animation coverage.

## Separate verified FitPulse video track

The mobile app has four profile-specific MP4 variants and four posters for two base movements:
- Pull-up — male and female
- Standard push-up — male and female

They are published from the FitPulse Animation Studio to `apps/web/public/exercises/`; mobile asset paths are symlinks to those public files. The resolver selects by profile and exact exercise identity. Push-up variants with different mechanics must not inherit the standard push-up clip.

These are a separate video-render track. They are **not** the original premium 2D library and do not increase its coverage count.

## Original 2D library coverage

The current generated registry contains **739 stable exercise IDs**:
- 66 workout-plan entries;
- 673 imported-library entries;
- 163 of the imported entries currently have Russian instructions (this is an instruction-translation count, **not** the imported-library total).

All 739 entries remain `not-started`. There are zero accepted original 2D animations and zero accepted original 2D rig prototypes. The earlier schematic SVG pilot was rejected after device review and remains excluded from coverage.

The registry groups 739 entries into 26 unreviewed heuristic candidate buckets. It flags 160 entries for manual classification: 3 have explicit source-data conflicts; 157 have no safe name-based family match and must not be treated as approved movement classifications.

**Correction to the earlier 229-entry snapshot:** 163 was mistakenly used as the number of imported exercises; it is the number of imported entries with Russian instructions. The full imported list contains 673 entries, so the correct total is 739.

## Legacy asset inventory

The generated inventory currently reports:
- 96 legacy image folders / 192 JPG frames;
- 61 local dataset GIFs and 61 JPG thumbnails;
- 58 GIF manifest entries, 56 with a matching local GIF;
- 3 GIF module references absent from the manifest and 2 manifest entries without a local GIF;
- 12 generic MP4 keys, plus 4 profile-specific MP4 variants and 4 matching PNG posters.

Legacy GIF/JPG media is not original FitPulse artwork. Source and redistribution rights must be reviewed independently; do not assume the Gym visual GIFs or copied JPG files are cleared for commercial APK distribution.

## Next implementation gates

1. Keep the generated inventory reproducible and make CI compare the complete generated JSON/report with the source-derived output.
2. Define the original 2D art direction and rig contract; do not revive the rejected schematic SVG.
3. Build one representative transparent 2D motion with exact exercise-ID mapping and male/female profile handling.
4. Validate technique, frame integrity, offline playback, Android rendering, and bundle-size budget before expanding to a motion family.
