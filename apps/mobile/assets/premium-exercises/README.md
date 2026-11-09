# FitPulse premium exercise animation pilot

**Current status (2026-11-09): documentation only.** In the current `main` tree this directory contains only this README. It does not contain the five pilot GIFs, generated frame sequences, or a runtime animation manifest.

## Historical five-motion RepDB pilot (not integrated)

Earlier revisions described a five-motion preview:
- Pull-up (home-plan ID 11)
- Bench leg pull-in
- Dumbbell biceps curl
- Front squat, clean grip
- One-arm kettlebell row

That pilot was developed on the old `fix/pr178-rebased-main` line. PR [#180](https://github.com/simaklaw/forma/pull/180) was closed without merging on 2026-11-08. PR [#303](https://github.com/simaklaw/forma/pull/303) transferred the non-premium workout/player/session stabilization to current `main`, but explicitly excluded `exercisePremiumMapping`, `exercisePremiumMedia`, `premiumGifAsset` wiring, and build-time GIF generation.

Therefore, the five RepDB GIFs are **not currently bundled through this directory**. This section records a historical pilot plan, not an implemented mobile feature.

Attribution recorded for the preview: **Exercise data & images: RepDB — https://repdb.co**. Before using any preview media in a distributable build, verify the exact permission scope for conversion, app distribution, offline embedding, and commercial use. Do not count third-party preview clips as original FitPulse animation coverage.

## Separate verified FitPulse video track

The current app has four profile-specific MP4 variants and four posters for two base movements:
- Pull-up — male and female
- Standard push-up — male and female

They are published from the FitPulse Animation Studio to `apps/web/public/exercises/`; mobile asset paths are symlinks to those public files. The mobile resolver selects them by profile and exact exercise identity. Push-up variants with different mechanics must not inherit the standard push-up clip.

These are a separate video-render track. They are **not** the original premium 2D library and do not increase its coverage count.

## Original 2D library status

The current coverage registry contains 229 stable exercise IDs (66 workout-plan entries and 163 imported-library entries). All 229 entries are `not-started`; there are zero approved original 2D animations and zero accepted original 2D rig prototypes. The earlier schematic SVG pilot was rejected after device review and remains excluded from coverage.

Legacy dataset GIFs and JPG frames are tracked separately. They are not original FitPulse art; source and redistribution rights must be reviewed independently.

## Next implementation gates

1. Regenerate the inventory from the current `main` sources and correct the generator's stale summary text before treating the report as current.
2. Design a new original 2D character/rig system rather than reviving the rejected schematic SVG.
3. Produce one representative motion with transparent output, exact exercise mapping, male/female profile handling, and an honest poster fallback.
4. Validate technique, frame integrity, offline playback, Android rendering, and bundle-size budget before expanding to a motion family.
