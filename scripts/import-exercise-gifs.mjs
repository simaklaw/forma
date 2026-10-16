/**
 * Match Forma imported library (free-exercise-db) to hasaneyldrm/exercises-dataset.
 * Writes exerciseGifManifest.generated.ts and optionally copies GIF + JPEG thumbs
 * into the monorepo for offline use.
 *
 * Usage:
 *   node scripts/import-exercise-gifs.mjs [/path/to/exercises.json] [--download]
 *
 * --download  fetch matched GIF + thumb into:
 *   apps/web/public/exercises/dataset/{id}.gif|.jpg
 *   apps/mobile/assets/exercises/dataset/{id}.gif|.jpg
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LIBRARY_FILE = path.join(
  ROOT,
  'apps/mobile/src/features/workout/importedExerciseLibrary.generated.ts'
);
const OUT_FILE = path.join(
  ROOT,
  'apps/mobile/src/features/workout/exerciseGifManifest.generated.ts'
);
const WEB_MEDIA_DIR = path.join(ROOT, 'apps/web/public/exercises/dataset');
const MOBILE_MEDIA_DIR = path.join(ROOT, 'apps/mobile/assets/exercises/dataset');

const RAW_BASE =
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/';
const SRC = 'https://github.com/hasaneyldrm/exercises-dataset';

const ALIASES = {
  pushups: 'push-up',
  'push-ups': 'push-up',
  crunches: 'crunch',
  plank: 'plank',
  'bodyweight squat': 'squat',
  'butt lift bridge': 'bridge',
  'glute kickback': 'glute kickback',
  'side bridge': 'side bridge',
  superman: 'superman',
  'scissor kick': 'scissors',
  'frog sit ups': 'frog crunch',
  'stomach vacuum': 'vacuum',
  'calf raises with bands': 'calf raise',
  'squats with bands': 'squat',
  'cross over with bands': 'cross over',
  'push ups close triceps position': 'close grip push up',
};

// Pairs verified by hand: drop wrong auto-matches, pin correct donors.
const MANUAL_REMOVE = new Set(['lib-side-bridge', 'lib-glute-kickback', 'lib-band-hip-adductions']);

const MANUAL_OVERRIDES = {
  'lib-butt-lift-bridge': 'hip raise (bent knee)',
  'lib-overhead-triceps': 'assisted standing triceps extension (with towel)'
};

function tokens(s) {
  s = String(s)
    .toLowerCase()
    .replace(/3\/4/g, '3 4')
    .replace(/45Â°/g, '45')
    .replace(/[^a-z0-9]+/g, ' ');
  const stop = new Set(['with', 'the', 'a', 'an', 'and', 'or', 'to', 'on', 'of', 'for', 'version']);
  return s.split(/\s+/).filter((t) => t && !stop.has(t));
}

function score(a, b) {
  const ta = new Set(tokens(a));
  const tb = new Set(tokens(b));
  if (!ta.size || !tb.size) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  return inter / Math.max(ta.size, tb.size);
}

function parseLibrary(ts) {
  const entries = [];
  const re = /"id":\s*"(lib-[^"]+)"[\s\S]*?"nameEn":\s*"([^"]+)"/g;
  let m;
  while ((m = re.exec(ts))) entries.push({ id: m[1], nameEn: m[2] });
  return entries;
}

async function loadHasan(argPath) {
  if (argPath && fs.existsSync(argPath)) {
    return JSON.parse(fs.readFileSync(argPath, 'utf8'));
  }
  const url = `${RAW_BASE}data/exercises.json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${url} â ${res.status}`);
  return res.json();
}

function pickBest(nameEn, hasan, libId) {
  if (libId && MANUAL_REMOVE.has(libId)) return null;
  const override = libId ? MANUAL_OVERRIDES[libId] : undefined;
  if (override) {
    let exact = null;
    for (const e of hasan) {
      if (e.name === override) {
        exact = e;
        break;
      }
    }
    return exact ? { entry: exact, score: 1 } : null;
  }
  const aliasKey = tokens(nameEn).join(' ');
  const aliasTarget = ALIASES[aliasKey];
  let best = null;
  let bestScore = 0;
  for (const e of hasan) {
    let s = score(nameEn, e.name);
    if (aliasTarget) {
      const aliasScore = score(aliasTarget, e.name);
      if (aliasScore > s) s = aliasScore;
    }
    if (s > bestScore) {
      bestScore = s;
      best = e;
    }
  }
  const threshold = aliasTarget ? 0.5 : 0.52;
  if (!best || bestScore < threshold) return null;
  return { entry: best, score: bestScore };
}

function stepsEn(entry) {
  const steps = entry.instruction_steps?.en;
  if (Array.isArray(steps) && steps.length) return steps.map(String);
  const blob = entry.instructions?.en;
  if (typeof blob === 'string' && blob.trim()) {
    return blob
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

async function downloadFile(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${url} â ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, buf);
  return buf.length;
}

async function main() {
  const args = process.argv.slice(2);
  const doDownload = args.includes('--download');
  const argPath = args.find((a) => !a.startsWith('--'));

  const hasan = await loadHasan(argPath);
  const library = parseLibrary(fs.readFileSync(LIBRARY_FILE, 'utf8'));
  const manifest = [];
  let downloaded = 0;
  let downloadBytes = 0;

  for (const lib of library) {
    const hit = pickBest(lib.nameEn, hasan, lib.id);
    if (!hit) continue;
    const relGif = (hit.entry.gif_url ?? '').replace(/^\//, '');
    if (!relGif) continue;
    const relImg = (hit.entry.image ?? '').replace(/^\//, '');
    const remoteGif = `${RAW_BASE}${relGif}`;
    const remoteThumb = relImg ? `${RAW_BASE}${relImg}` : undefined;

    let localGifPath;
    let localThumbPath;
    if (doDownload) {
      const safeId = lib.id.replace(/[^a-z0-9-]/gi, '_');
      const webGif = path.join(WEB_MEDIA_DIR, `${safeId}.gif`);
      const webJpg = path.join(WEB_MEDIA_DIR, `${safeId}.jpg`);
      const mobGif = path.join(MOBILE_MEDIA_DIR, `${safeId}.gif`);
      const mobJpg = path.join(MOBILE_MEDIA_DIR, `${safeId}.jpg`);
      try {
        const n = await downloadFile(remoteGif, webGif);
        fs.mkdirSync(MOBILE_MEDIA_DIR, { recursive: true });
        fs.copyFileSync(webGif, mobGif);
        downloadBytes += n;
        localGifPath = `/exercises/dataset/${safeId}.gif`;
        downloaded += 1;
        if (remoteThumb) {
          const n2 = await downloadFile(remoteThumb, webJpg);
          fs.copyFileSync(webJpg, mobJpg);
          downloadBytes += n2;
          localThumbPath = `/exercises/dataset/${safeId}.jpg`;
        }
        process.stdout.write('.');
      } catch (err) {
        console.warn(`\nskip media ${lib.id}: ${err.message}`);
      }
    }

    manifest.push({
      id: lib.id,
      gifUrl: remoteGif,
      thumbUrl: remoteThumb,
      localGifPath: localGifPath ?? null,
      localThumbPath: localThumbPath ?? null,
      sourceName: hit.entry.name,
      matchScore: Math.round(hit.score * 100) / 100,
      instructionsEn: stepsEn(hit.entry),
      bodyPart: hit.entry.body_part ?? null,
      target: hit.entry.target ?? null,
      muscleGroup: hit.entry.muscle_group ?? null,
      equipment: hit.entry.equipment ?? null,
      secondaryMuscles: Array.isArray(hit.entry.secondary_muscles)
        ? hit.entry.secondary_muscles
        : [],
      category: hit.entry.category ?? null,
      sourceUrl: SRC,
    });
  }

  manifest.sort((a, b) => a.id.localeCompare(b.id));

  const body = `/**
 * AUTO-GENERATED by scripts/import-exercise-gifs.mjs â do not edit by hand.
 * Matched from hasaneyldrm/exercises-dataset.
 * Metadata linked to free-exercise-db library ids (lib-*).
 *
 * Re-run:
 *   node scripts/import-exercise-gifs.mjs [--download]
 */

export interface ExerciseGifManifestEntry {
  id: string;
  /** Remote CDN GIF (always set). Prefer localGifPath when present. */
  gifUrl: string;
  thumbUrl?: string;
  /** App-relative path under web public, e.g. /exercises/dataset/lib-plank.gif */
  localGifPath: string | null;
  localThumbPath: string | null;
  sourceName: string;
  matchScore: number;
  /** Step-by-step English cues from the dataset. */
  instructionsEn: string[];
  bodyPart: string | null;
  target: string | null;
  muscleGroup: string | null;
  equipment: string | null;
  secondaryMuscles: string[];
  category: string | null;
  sourceUrl: string;
}

export const EXERCISE_GIF_MANIFEST: ExerciseGifManifestEntry[] = ${JSON.stringify(
    manifest,
    null,
    2
  )};

export function gifEntryForLibraryId(id: string): ExerciseGifManifestEntry | undefined {
  return EXERCISE_GIF_MANIFEST.find((e) => e.id === id);
}

/** Prefer offline local path, else remote URL. */
export function resolveGifUri(entry: ExerciseGifManifestEntry): string {
  return entry.localGifPath ?? entry.gifUrl;
}

export function resolveThumbUri(entry: ExerciseGifManifestEntry): string | undefined {
  return entry.localThumbPath ?? entry.thumbUrl;
}
`;

  fs.writeFileSync(OUT_FILE, body, 'utf8');

  // Mobile Metro require map for offline GIF/thumb modules
  const assetOut = path.join(
    ROOT,
    'apps/mobile/src/features/workout/exerciseDatasetAssets.generated.ts'
  );
  const gifFiles = fs.existsSync(MOBILE_MEDIA_DIR)
    ? fs.readdirSync(MOBILE_MEDIA_DIR).filter((f) => f.endsWith('.gif'))
    : [];
  const assetLines = [
    '/** AUTO-GENERATED companion to import-exercise-gifs.mjs â local dataset media. */',
    '/* eslint-disable @typescript-eslint/no-require-imports */',
    '',
    'export const DATASET_GIF_MODULES: Record<string, number> = {',
  ];
  for (const f of gifFiles.sort()) {
    const id = f.replace(/\.gif$/, '');
    assetLines.push(`  '${id}': require('../../../assets/exercises/dataset/${f}'),`);
  }
  assetLines.push('};', '', 'export const DATASET_THUMB_MODULES: Record<string, number> = {');
  for (const f of gifFiles.sort()) {
    const id = f.replace(/\.gif$/, '');
    const jpg = `${id}.jpg`;
    if (fs.existsSync(path.join(MOBILE_MEDIA_DIR, jpg))) {
      assetLines.push(`  '${id}': require('../../../assets/exercises/dataset/${jpg}'),`);
    }
  }
  assetLines.push('};', '');
  fs.writeFileSync(assetOut, assetLines.join('\n'), 'utf8');
  console.log(`Wrote require map ${path.relative(ROOT, assetOut)} (${gifFiles.length} gifs)`);

  console.log(
    `\nWrote ${manifest.length} mappings â ${path.relative(ROOT, OUT_FILE)}` +
      (doDownload
        ? ` | downloaded ${downloaded} gifs (~${(downloadBytes / 1024 / 1024).toFixed(1)} MB)`
        : ' | no media download (pass --download)')
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
