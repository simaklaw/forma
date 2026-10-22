/**
 * Media-manifest integrity gate.
 *
 * Adapted from the workout-guide catalog-validation pattern
 * (bryllim/workout-guide, scripts/validate-catalog.mjs, MIT): generated
 * manifests must stay in sync with the files actually shipped.
 *
 * Binary-requiring modules (exerciseMedia.ts, exerciseDatasetAssets.generated,
 * importedExerciseImages.generated) cannot be imported under the node jest
 * environment (see exerciseRealMedia.test.ts), so the key lists below mirror
 * those modules and the checks go straight to the filesystem instead.
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { EXERCISE_GIF_MANIFEST } from './exerciseGifManifest.generated';
import { IMPORTED_EXERCISE_LIBRARY } from './importedExerciseLibrary.generated';

const mobileRoot = resolve(__dirname, '../../..'); // apps/mobile
const webPublic = resolve(mobileRoot, '../web/public'); // apps/web/public

/** Mirrors EXERCISE_VIDEOS keys in exerciseMedia.ts (all 13 ExerciseMediaKey). */
const BUNDLED_VIDEO_KEYS = [
  'pushup',
  'squat',
  'pullup',
  'lunge',
  'plank',
  'dead-bug',
  'chair-dip',
  'glute-bridge',
  'row-band',
  'hip-thrust',
  'shoulder-press',
  'side-plank',
  'stomach-vacuum'
] as const;

/** Mirrors EXERCISE_THUMBNAILS keys in exerciseMedia.ts (stomach-vacuum has no poster). */
const BUNDLED_THUMB_KEYS = [
  'pushup',
  'squat',
  'pullup',
  'lunge',
  'plank',
  'dead-bug',
  'chair-dip',
  'glute-bridge',
  'row-band',
  'hip-thrust',
  'shoulder-press',
  'side-plank'
] as const;

/** Mirrors REAL_GIF_BY_MEDIA_KEY values in exerciseRealMedia.ts. */
const VETTED_DATASET_GIF_IDS = [
  'lib-pushups',
  'lib-dead-bug',
  'lib-butt-lift-bridge',
  'lib-shoulder-press-with-bands'
] as const;

describe('exercise gif manifest integrity', () => {
  it('has unique library ids', () => {
    const ids = EXERCISE_GIF_MANIFEST.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every entry records a remote gif url and a dataset source url', () => {
    for (const entry of EXERCISE_GIF_MANIFEST) {
      expect(entry.gifUrl.trim().length).toBeGreaterThan(0);
      expect(entry.sourceUrl.trim().length).toBeGreaterThan(0);
      expect(entry.sourceName.trim().length).toBeGreaterThan(0);
    }
  });

  it('records a numeric match score', () => {
    for (const entry of EXERCISE_GIF_MANIFEST) {
      expect(Number.isFinite(entry.matchScore)).toBe(true);
      expect(entry.matchScore).toBeGreaterThanOrEqual(0);
    }
  });

  it('localGifPath/localThumbPath files exist on disk when set', () => {
    for (const entry of EXERCISE_GIF_MANIFEST) {
      if (entry.localGifPath) {
        expect(existsSync(`${webPublic}${entry.localGifPath}`)).toBe(true);
      }
      if (entry.localThumbPath) {
        expect(existsSync(`${webPublic}${entry.localThumbPath}`)).toBe(true);
      }
    }
  });

  it('vetted real-gif ids exist in the manifest', () => {
    for (const libId of VETTED_DATASET_GIF_IDS) {
      expect(EXERCISE_GIF_MANIFEST.some((e) => e.id === libId)).toBe(true);
    }
  });
});

describe('bundled exercise media integrity', () => {
  it('every bundled clip exists on disk', () => {
    for (const key of BUNDLED_VIDEO_KEYS) {
      expect(existsSync(resolve(mobileRoot, 'assets/exercises', `${key}.mp4`))).toBe(true);
    }
  });

  it('every bundled thumbnail exists on disk', () => {
    for (const key of BUNDLED_THUMB_KEYS) {
      expect(existsSync(resolve(mobileRoot, 'assets/exercises', `${key}.jpg`))).toBe(true);
    }
  });

  it('vetted dataset gif/thumb pairs exist on disk', () => {
    for (const libId of VETTED_DATASET_GIF_IDS) {
      expect(
        existsSync(resolve(mobileRoot, 'assets/exercises/dataset', `${libId}.gif`))
      ).toBe(true);
      expect(
        existsSync(resolve(mobileRoot, 'assets/exercises/dataset', `${libId}.jpg`))
      ).toBe(true);
    }
  });
});

describe('imported library provenance & media integrity', () => {
  it('has unique library ids', () => {
    const ids = IMPORTED_EXERCISE_LIBRARY.map((ex) => ex.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every entry records sourceLicense and sourceUrl (attribution model)', () => {
    for (const ex of IMPORTED_EXERCISE_LIBRARY) {
      expect(ex.sourceLicense.trim().length).toBeGreaterThan(0);
      expect(ex.sourceUrl.trim().length).toBeGreaterThan(0);
    }
  });

  it('every imageKey points to a bundled library image on disk', () => {
    for (const ex of IMPORTED_EXERCISE_LIBRARY) {
      for (const key of ex.imageKeys) {
        const match = /^([a-z0-9][a-z0-9-]*)-([01])$/.exec(key);
        expect(match).not.toBeNull();
        if (!match) continue;
        const [slug, index] = [match[1], match[2]];
        expect(
          existsSync(resolve(mobileRoot, 'assets/exercise-library', slug, `${index}.jpg`))
        ).toBe(true);
      }
    }
  });
});
