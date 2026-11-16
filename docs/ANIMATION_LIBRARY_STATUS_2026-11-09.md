# FitPulse original premium 2D animation library — status snapshot

**Snapshot date:** 2026-11-09  
**Repository:** `simaklaw/forma`  
**Base revision checked:** `2ca7bd5514f706725e60b974082c1c05349affdb` (`main`)

This document separates the original 2D library from the existing profile-specific video track and records the state found during the current repository audit. It is not a claim that the 2D library is implemented.

## 1. Branch and PR state

| Item | Verified state |
|---|---|
| `main` | `2ca7bd5`, latest merge #304 (2026-11-08) |
| `feat/premium-exercise-animation-library` | `0cf75e8`, diverged from main: 124 commits ahead / 200 behind |
| PR for the old feature branch | No open PR found |
| PR #180 | Closed without merge on 2026-11-08 |
| PR #303 | Merged on 2026-11-08; carries workout/session/media stabilization but excludes the premium RepDB pilot |
| PR #241 | Merged on 2026-10-28; publishes four profile-specific videos and four posters from the separate FitPulse Animation Studio track |

Do not merge or rebase the old feature branch wholesale. Its history diverges substantially and includes old workflow, media, and screen changes. The current implementation line should start from current `main`.

## 2. Original 2D coverage

The committed `docs/EXERCISE_ANIMATION_COVERAGE.json` currently records:

- 66 workout-plan entries;
- 163 imported-library entries;
- 229 stable IDs total;
- 0 original rig prototypes;
- 229 entries marked `not-started`;
- 25 preliminary motion-family candidates, all unreviewed;
- 3 records requiring manual movement/equipment classification.

The prior hand-drawn SVG prototype was rejected after device review. It must not be counted as coverage or revived unchanged. Existing dataset GIFs and JPG frames are legacy/reference media; profile-specific MP4 videos belong to a separate FitPulse video-render track. None of these assets count as original 2D coverage.

## 3. Current asset inventory

Counts below were checked against the Git tree at the snapshot revision, not inferred from a screenshot.

| Location | Files | Bytes | Meaning |
|---|---:|---:|---|
| `apps/mobile/assets/exercise-library` | 96 folders / 192 JPG | 10,226,919 | Two legacy still frames per folder; rights for the specific copied files remain unverified |
| `apps/mobile/assets/exercises/dataset` | 61 GIF + 61 JPG | 6,019,036 total | Legacy dataset previews; GIF redistribution rights require review |
| `apps/mobile/assets/premium-exercises` | 1 README | 1,341 | No generated premium GIFs or frame files are committed in this directory |
| `apps/mobile/assets/exercises` | 16 MP4 symlinks + 4 PNG symlinks | symlink entries | Mobile paths point to shared files in `apps/web/public/exercises`; they are not duplicate binary payloads |

The separate `apps/web/public/exercises/fitpulse-animation-manifest.json` lists four profile variants (male/female pull-up and standard push-up). The four videos plus four posters total 734,234 bytes according to that manifest. They are already wired into the mobile resolver, but they are a separate video-render track and **do not count toward original 2D coverage**.

The inventory documents need a fresh generator run. The current `EXERCISE_ANIMATION_INVENTORY.md` still identifies its source as the old PR #180 branch, and the committed coverage JSON reports 13 bundled MP4 keys even though current `exerciseMedia.ts` has 12 generic MP4 entries plus four profile-specific MP4 variants. The report generator also contains a stale literal “225” in its generated prose. Correct that reporting logic before regenerating the report; do not hand-edit generated output as if it were authoritative.

## 4. Current runtime wiring

Verified in current `main`:

- `exerciseMedia.ts` declares profile-specific male/female MP4 and poster variants for `pushup` and `pullup`, plus the generic legacy media map.
- `exerciseMediaSelection.ts` allows profile-specific standard push-up media only for IDs 10 and 59, and pull-up media only for ID 11.
- `ExerciseSheet.tsx` resolves the profile-specific source/poster, then uses exact-match legacy GIF/poster fallbacks.
- `ExerciseVideo.tsx` plays MP4 through `expo-video` and supports local GIF/poster fallback.
- The premium five-motion RepDB mapping and build-time GIF generation are absent from current `main`; PR #303 deliberately excluded them.

This is useful existing infrastructure, but it is not a completed 2D animation library.

## 5. CI and APK verification

| Check | Result | Scope |
|---|---|---|
| Monorepo CI, run [#42484340663](https://github.com/simaklaw/forma/actions/runs/42484340663) | Success, 2026-11-08 | Current `main` at #304; 99 test suites and 766 tests passed |
| Sync setup E2E, run [#42484341009](https://github.com/simaklaw/forma/actions/runs/42484341009) | Success, 2026-11-08 | Sync workflow setup |
| Verified animation media sync, run [#42617995945](https://github.com/simaklaw/forma/actions/runs/42617995945) | Success, 2026-11-09 | Re-verified four videos and four posters against source manifests; no new PR/update was needed |
| Latest successful APK, run [#42368672919](https://github.com/simaklaw/forma/actions/runs/42368672919) | Success, 2026-11-07 | Built from `80c225b`, before PRs #303 and #304; not a verification of the current main revision |

The current main revision therefore has green CI, but no APK build after the #303/#304 changes was found in the latest workflow runs. The next smoke build must be installed and checked on a physical Android device before claiming device acceptance.

## 6. Rights and quality blockers

1. The RepDB preview pilot is not integrated. The repository records attribution, but the exact permission scope for conversion, offline APK embedding, and commercial distribution must be verified before use.
2. The 61 dataset GIFs are not original FitPulse art; the source's media rights are separate from its metadata/code license.
3. The 192 legacy JPG frames are associated with `yuhonas/free-exercise-db`, but rights for the exact copied files have not been independently confirmed.
4. The 3 ambiguous imported entries must remain blocked from animation mapping until their technique/equipment metadata is corrected.
5. There is no accepted original 2D prototype. The previous SVG attempt failed visual review.
6. Current green CI does not prove visual technique, offline playback, or Android device acceptance.

## 7. Next planned stage

**Phase 0 — refresh inventory and reporting first.**

1. Correct `scripts/report-exercise-animation-inventory.mjs`: derive counts from current source, separate generic media keys from profile-specific variants, and remove hard-coded historical totals.
2. Regenerate `EXERCISE_ANIMATION_INVENTORY.md` and `EXERCISE_ANIMATION_COVERAGE.json` on current `main`; verify 229 stable IDs and the exact asset-manifest discrepancies.
3. Keep legacy media, original 2D prototypes, and the separate video-render track in separate status fields.
4. Only then begin Phase 1: design a new premium 2D rig/style gate and build one representative original motion. Do not create a large batch before the first animation passes visual, technical, and on-device review.

No application logic, workout behavior, timer, history, navigation, or `main` branch was changed by this status snapshot.
