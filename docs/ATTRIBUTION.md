# Attribution & Media Provenance

Central map of third-party data, media, and adopted code patterns used by
FitPulse. Follows the per-asset attribution model of
[bryllim/workout-guide](https://github.com/bryllim/workout-guide) (MIT): every
generated asset family records its source, license, and obligations, and CI
(`exerciseMediaIntegrity.test.ts`) enforces that provenance fields stay filled.

| Asset family | Where | Source | License / terms |
|---|---|---|---|
| Imported exercise library (names, instructions) | `importedExerciseLibrary.generated.ts` | [yuhonas/free-exercise-db](https://github.com/yuhonas/free-exercise-db) | Unlicense (public domain); per-entry `sourceLicense`/`sourceUrl`. Russian translations are ours. |
| Imported exercise images | `assets/exercise-library/**` | yuhonas/free-exercise-db | Unlicense (public domain); images linked per-entry via `imageKeys`. |
| Dataset GIF metadata (names, categories, EN instructions) | `exerciseGifManifest.generated.ts` | [hasaneyldrm/exercises-dataset](https://github.com/hasaneyldrm/exercises-dataset) | MIT (dataset data); per-entry `sourceUrl`, `matchScore`. |
| Dataset GIF/JPG media | `assets/exercises/dataset/**`, remote `gifUrl`/`thumbUrl` | hasaneyldrm/exercises-dataset media files | **© Gym visual** — see the action item below. |
| Bundled MP4 clips + JPG posters | `assets/exercises/*.mp4|.jpg` | own pipeline (`scripts/exercise-videos/`, salvaged from the former duplicate repo) | project-owned. |
| `stomach-vacuum.mp4` | `apps/web/public/exercises/stomach-vacuum.mp4` (+ mobile symlink) | restored from git history by `.github/workflows/restore-stomach-vacuum.yml` (source commit `f6cba20`, «Add files via upload») | **unverified — owner decision required, see the section below.** |
| wger exercise photo references | runtime `wgerSearchTerm` lookups | [wger.de](https://wger.de) / [wger GitHub](https://github.com/wger-project/wger) | AGPL-3.0 server; runtime references only, no bundled assets. |
| Search normalization pattern | `apps/mobile/src/lib/normalizeSearch.ts` | [bryllim/workout-guide](https://github.com/bryllim/workout-guide) (MIT) | adapted `normalizeSearchText`; see file header. |
| Manifest validation pattern | `exerciseMediaIntegrity.test.ts` | bryllim/workout-guide `scripts/validate-catalog.mjs` (MIT) | adapted to jest + filesystem checks. |

## ⚠️ Gym visual media — owner decision required

The animated exercise GIFs distributed via `hasaneyldrm/exercises-dataset` are
property of **Gym visual** (https://gymvisual.com/). The dataset's LICENSE
("MEDIA EXCEPTION") and NOTICE.md state that the written permission covers
redistribution **inside that repository only** and explicitly warns:
“Cloning this repository does not grant you any license to the media; obtain
your own from Gym visual.”

Before any release that ships these assets, FitPulse must either:

1. obtain a separate license/permission from Gym visual, or
2. confirm the planned use is allowed by Gym visual's Terms & Conditions of Use
   (https://gymvisual.com/content/3-terms-and-conditions-of-use).

Attribution "© Gym visual — https://gymvisual.com/" must be kept intact for any
use, and the dataset's 180×180 redistribution resolution limit applies.

This document is the tracking point for that legal review.


## ⚠️ stomach-vacuum.mp4 — owner decision required

The `stomach-vacuum.mp4` clip (1.6 MB) was not produced by the project's own
pipeline: it was committed once via a web upload (commit `f6cba20`, message
«Add files via upload») and is re-restored from git history by
`.github/workflows/restore-stomach-vacuum.yml`. The original filename
(`Stomach Vacuums Exercise [ Exercise Library ](720P_HD).mp4`) follows the
typical naming of a YouTube download, and no license or permission is
documented for it.

Unlike the other bundled clips (~50–140 KB, rendered by
`scripts/exercise-videos/`), this asset cannot be claimed as project-owned.
Before any release that ships it, FitPulse must either:

1. verify the source and obtain a license/permission for the video, or
2. replace it with a clip rendered by the project's own pipeline, or
3. remove it from the shipped assets.

This document is the tracking point for that decision.
