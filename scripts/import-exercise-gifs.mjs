#!/usr/bin/env node
/**
 * Match free-exercise-db library ids → hasaneyldrm GIF URLs (Gym visual style).
 * Prefer high coverage + consistent single media style.
 *
 * Usage: node scripts/import-exercise-gifs.mjs [path/to/exercises.json]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const libPath = resolve(root, 'apps/mobile/src/features/workout/importedExerciseLibrary.generated.ts');
const outPath = resolve(root, 'apps/mobile/src/features/workout/exerciseGifManifest.generated.ts');

const THRESHOLD = 0.55;
const BASE = 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/';

/** Manual aliases: normalized lib name → preferred hasan search phrase */
const ALIASES = {
  'band good morning pull through': 'band good morning',
  'band hip adductions': 'hip adduction',
  'butt lift bridge': 'glute bridge',
  'calf raises with bands': 'calf raise',
  'cross over with bands': 'cable crossover',
  'crunches': 'crunch',
  'dips triceps version': 'triceps dip',
  'double leg butt kick': 'walking high knees lunge',
  'external rotation with band': 'external rotation',
  'fast skipping': 'jump rope',
  'freehand jump squat': 'jump squat',
  'frog sit ups': 'frog sit-up',
  'glute kickback': 'cable kickback',
  'handstand push ups': 'handstand push-up',
  'hip circles prone': 'ankle circles',
  'hip extension with bands': 'hip extension',
  'hip flexion with band': 'hip flexion',
  'internal rotation with band': 'internal rotation',
  'isometric chest squeezes': 'chest squeeze',
  'knee tuck jump': 'tuck jump',
  'lateral raise with bands': 'lateral raise',
  'leg pull in': 'leg pull-in',
  'lying glute': 'lying glute stretch',
  'oblique crunches': 'oblique crunch',
  'overhead triceps': 'overhead triceps extension',
  'push ups close triceps position': 'close-grip push-up',
  'pushups': 'push-up',
  'pushups close and wide hand positions': 'push-up',
  'push up wide': 'wide hand push up',
  'rear leg raises': 'rear leg raise',
  'scissor kick': 'flutter kicks',
  'scissors jump': 'scissor jumps',
  'seated biceps': 'biceps curl',
  'shoulder press with bands': 'shoulder press',
  'side bridge': 'side plank',
  'side jackknife': 'jackknife sit-up',
  'side leg raises': 'side leg raise',
  'single leg butt kick': 'walking high knees lunge',
  'sit up': 'sit-up',
  'speed band overhead triceps': 'overhead triceps extension',
  'split jump': 'scissor jumps',
  'squats with bands': 'squat',
  'star jump': 'star jump',
  'superman': 'superman',
  'toe touchers': 'toe touch',
  'upright row with bands': 'upright row',
  '90 90 hamstring': 'hamstring stretch',
  'lying crossover': 'lying crossover stretch',
  'lying prone quadriceps': 'quad stretch',
  'seated front deltoid': 'front raise',
  'seated glute': 'seated glute stretch',
  'standing hip circles': 'hip circles',
  'bodyweight squat': 'bodyweight squat',
  'band pull apart': 'band pull through',
  'rocket jump': 'forward jump',
  'standing long jump': 'forward jump',
  'lateral bound': 'forward jump',
};

const STOP = new Set([
  'with', 'the', 'a', 'an', 'and', 'or', 'to', 'on', 'of', 'for', 'version',
  'bands', 'band', 'using', 'machine', 'cable', 'dumbbell', 'barbell', 'bodyweight',
]);

function normalize(s) {
  return s
    .toLowerCase()
    .replace('3/4', '3 4')
    .replace('90/90', '90 90')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function tokens(s) {
  return normalize(s).split(' ').filter((t) => t && !STOP.has(t));
}

function score(a, b) {
  const ta = new Set(tokens(a));
  const tb = new Set(tokens(b));
  if (!ta.size || !tb.size) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  const union = new Set([...ta, ...tb]).size;
  const jaccard = inter / union;
  const contain = inter / ta.size;
  return Math.max(jaccard, contain * 0.95);
}

function parseLibrary(ts) {
  const entries = [];
  const re = /"id":\s*"(lib-[^"]+)"[\s\S]*?"nameEn":\s*"([^"]+)"/g;
  let m;
  while ((m = re.exec(ts))) entries.push({ id: m[1], nameEn: m[2] });
  return entries;
}

const jsonPath = process.argv[2] || resolve('/tmp/hasan-ex.json');
const hasan = JSON.parse(readFileSync(jsonPath, 'utf8'));
const lib = parseLibrary(readFileSync(libPath, 'utf8'));

const results = [];
const unmatched = [];

for (const { id, nameEn } of lib) {
  const n = normalize(nameEn);
  const query = ALIASES[n] || n;
  let best = null;
  let bestScore = 0;

  for (const e of hasan) {
    const hn = normalize(e.name);
    if (hn === normalize(query) || hn === n) {
      best = e;
      bestScore = 1;
      break;
    }
  }
  if (!best) {
    for (const e of hasan) {
      const s = Math.max(score(query, e.name), score(nameEn, e.name));
      if (s > bestScore) {
        best = e;
        bestScore = s;
      }
    }
  }

  if (best && bestScore >= THRESHOLD) {
    results.push({
      id,
      gifUrl: BASE + best.gif_url,
      sourceName: best.name,
      matchScore: Math.round(bestScore * 100) / 100,
    });
  } else {
    unmatched.push({ id, nameEn, best: best?.name, score: bestScore });
  }
}

results.sort((a, b) => a.id.localeCompare(b.id));

const payload = JSON.stringify(
  results.map((e) => ({
    id: e.id,
    path: e.gifUrl.replace(BASE, ''),
    name: e.sourceName,
    score: e.matchScore,
  }))
);

const body = `/**
 * AUTO-GENERATED — Gym visual GIF via hasaneyldrm (180×180).
 * Policy: MP4 → GIF → none. Attribution required.
 * NOTICE: media © Gym visual — clone ≠ product license. Re-run: node scripts/import-exercise-gifs.mjs
 */

export interface ExerciseGifManifestEntry {
  id: string;
  gifUrl: string;
  thumbUrl?: string;
  sourceName: string;
  matchScore: number;
  instructionsRu: string | null;
  attribution: string;
  sourceUrl: string;
}

const BASE = 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/';
const ATTR = '© Gym visual — https://gymvisual.com/';
const SRC = 'https://github.com/hasaneyldrm/exercises-dataset';

const RAW: { id: string; path: string; name: string; score: number }[] = ${payload};

export const EXERCISE_GIF_MANIFEST: ExerciseGifManifestEntry[] = RAW.map((e) => ({
  id: e.id,
  gifUrl: BASE + e.path,
  sourceName: e.name,
  matchScore: e.score,
  instructionsRu: null,
  attribution: ATTR,
  sourceUrl: SRC,
}));

export function gifEntryForLibraryId(id: string): ExerciseGifManifestEntry | undefined {
  return EXERCISE_GIF_MANIFEST.find((e) => e.id === id);
}
`;

writeFileSync(outPath, body);
console.log(`Wrote ${results.length}/${lib.length} GIF mappings → ${outPath}`);
if (unmatched.length) {
  console.log('Unmatched:');
  for (const u of unmatched) console.log(`  ${u.id} (${u.nameEn}) best=${u.best} @${u.score?.toFixed?.(2)}`);
}
