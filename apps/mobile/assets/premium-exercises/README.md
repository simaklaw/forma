# FitPulse premium exercise animation pilot

The reviewed pilot contains male and female variants for five exercise identities:
- Pull-up (fixed home-plan exercise ID 11 with exact search term)
- Bench leg pull-in (library ID lib-flat-bench-leg-pull-in)
- Dumbbell biceps curl (library ID lib-dumbbell-bicep-curl)
- Front squat, clean grip (library ID lib-front-squat-clean-grip)
- One-arm kettlebell row (library ID lib-one-arm-kettlebell-row)

The Android app bundles these GIFs locally. The selected variant follows the user's profile sex; no network is required to display the animation. Mapping is intentionally exact and does not infer equivalence from shared muscle groups.

Attribution: **Exercise data & images: RepDB — https://repdb.co**.

These are pilot animations only, not coverage of all 229 app exercise IDs. Confirm the applicable RepDB license/permission for any intended distribution or commercial use before release.


Build pipeline note: the five selected motions are converted from the source WebP bundle to local transparent GIFs during Android CI; generated binaries are not committed to this branch. The next PR build targets 384×384 output and 30 sampled frames (previous successful build: 160×160, 20 frames). The pilot is not full-library coverage and does not count as original-authored animation coverage.
