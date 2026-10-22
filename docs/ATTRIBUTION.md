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
