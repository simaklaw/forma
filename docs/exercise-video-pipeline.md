# Exercise video pipeline

The imported exercise library can play clips from
`apps/mobile/src/features/workout/exerciseVideoManifest.generated.ts`.
The manifest starts empty: the archive contains code, not a video dataset.

## Generate the manifest

Place MP4 files in a local directory, including any subdirectories. Host them
under the same relative paths at an HTTP(S) base URL, then run:

```bash
EXERCISE_VIDEO_RAW_BASE=https://your-host.example/videos \
  node scripts/import-exercise-videos.mjs /path/to/videos
```

The command generates URL mappings; it does not upload or bundle the files.
It prints the number of MP4 files, up to 15 sample paths, and matched exercises.
Matching accepts slug and underscore names, optional male suffixes, and any
extension letter case. Duplicate matching basenames are reported as ambiguous.
Missing configuration or zero matches leave the existing manifest intact.

Attribution defaults to `harshvishu/free-exercise-db-with-videos` and `MIT`.
For a different dataset, set `EXERCISE_VIDEO_SOURCE_URL` and
`EXERCISE_VIDEO_SOURCE_LICENSE` to that dataset's metadata.
There is no default hosting URL.

## Playback and cache

`ExerciseMediaService.getPlaybackSource(id, mediaKey?)` prefers a bundled
asset, then a complete disk file, then a manifest URL. The imported-library
panel requests videos when an exercise is selected and keeps images available.

Remote clips stream immediately while one background download per ID is queued.
Successful downloads move from `.part` files to the playback cache. Completed
videos have a 1 GiB cache budget; eviction uses persisted last-viewed timestamps.
An individual clip larger than that budget is streamed without being retained.
`getCacheSizeBytes()` reports completed video bytes; `clearCache()` waits for
queued downloads before clearing the directory.

## Checks

```bash
node --test scripts/import-exercise-videos.test.mjs scripts/lib/exerciseImportRules.test.mjs
pnpm --filter @forma/mobile run test --runInBand ExerciseMediaService
pnpm --filter @forma/mobile type-check
```
