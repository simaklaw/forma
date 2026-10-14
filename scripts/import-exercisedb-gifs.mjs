#!/usr/bin/env node
/**
 * Match free-exercise-db library ids → ExerciseDB-style GIFs
 * (mohamedatef90/exercise-library mirror — same media set as classic EDB).
 *
 * Usage:
 *   curl -sL https://raw.githubusercontent.com/mohamedatef90/exercise-library/main/exercises.json -o /tmp/edb-lib.json
 *   node scripts/import-exercisedb-gifs.mjs /tmp/edb-lib.json
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const libPath = resolve(root, 'apps/mobile/src/features/workout/importedExerciseLibrary.generated.ts');
const outPath = resolve(root, 'apps/mobile/src/features/workout/exerciseGifManifest.generated.ts');
const THRESHOLD = 0.52;
const BASE = 'https://raw.githubusercontent.com/mohamedatef90/exercise-library/main/gifs/';

const ALIASES = {
  crunches: 'crunch floor',
  pushups: 'push-up',
  'sit up': 'sit-up',
  'band good morning pull through': 'barbell good morning',
  'freehand jump squat': 'jump squat',
  'side bridge': 'side plank',
  'fast skipping': 'jump rope',
  'scissor kick': 'flutter kicks',
  '90 90 hamstring': 'hamstring stretch',
  'glute kickback': 'cable kickback',
  'band hip adductions': 'cable hip adduction',
  'band pull apart': 'band pull through',
  'bent knee hip raise': 'hip raise bent knee',
  'butt lift bridge': 'barbell glute bridge',
  'double leg butt kick': 'walking high knees lunge',
  'frog sit ups': 'frog crunch',
  'handstand push ups': 'handstand push-up',
  'hip circles prone': 'ankle circles',
  'overhead triceps': 'cable overhead triceps extension',
  plank: 'front plank',
  'push up wide': 'wide hand push up',
  'push ups close triceps position': 'close-grip push-up',
  'rear leg raises': 'rear leg raise',
  'rocket jump': 'forward jump',
  'scissors jump': 'scissor jumps',
  'seated biceps': 'dumbbell seated biceps curl',
  'seated front deltoid': 'dumbbell front raise',
  'shoulder press with bands': 'band shoulder press',
  'side jackknife': 'jackknife sit-up',
  'side leg raises': 'side leg raise',
  'single leg butt kick': 'walking high knees lunge',
  'single leg glute bridge': 'single leg bridge',
  'speed band overhead triceps': 'cable overhead triceps extension',
  'split jump': 'scissor jumps',
  'squats with bands': 'band squat',
  'standing long jump': 'forward jump',
  'star jump': 'star jump',
  superman: 'superman',
  'toe touchers': 'toe touch',
  'upright row with bands': 'barbell upright row',
};

const STOP = new Set(
  'with the a an and or to on of for version bands band using machine cable dumbbell barbell bodyweight'.split(
    ' '
  )
);

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
  return normalize(s)
    .split(' ')
    .filter((t) => t && !STOP.has(t));
}

function score(a, b) {
  const ta = new Set(tokens(a));
  const tb = new Set(tokens(b));
  if (!ta.size || !tb.size) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  const jaccard = inter / new Set([...ta, ...tb]).size;
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

const jsonPath = process.argv[2] || '/tmp/edb-lib.json';
const edb = JSON.parse(readFileSync(jsonPath, 'utf8'));
const lib = parseLibrary(readFileSync(libPath, 'utf8'));
const results = [];
const unmatched = [];

for (const { id, nameEn } of lib) {
  const n = normalize(nameEn);
  const query = ALIASES[n] || n;
  let best = null;
  let bestScore = 0;
  for (const e of edb) {
    const hn = normalize(e.name);
    if (hn === normalize(query) || hn === n) {
      best = e;
      bestScore = 1;
      break;
    }
  }
  if (!best) {
    for (const e of edb) {
      const s = Math.max(score(query, e.name), score(nameEn, e.name));
      if (s > bestScore) {
        best = e;
        bestScore = s;
      }
    }
  }
  if (best && bestScore >= THRESHOLD) {
    let g = best.gif || best.id;
    if (!String(g).endsWith('.gif')) g = `${g}.gif`;
    results.push({
      id,
      path: g,
      name: best.name,
      score: Math.round(bestScore * 100) / 100,
    });
  } else {
    unmatched.push({ id, nameEn, best: best?.name, score: bestScore });
  }
}

results.sort((a, b) => a.id.localeCompare(b.id));
const payload = JSON.stringify(results);

const body = `/**
 * AUTO-GENERATED — ExerciseDB-family GIFs (exercise-library / EDB media set).
 * Coverage ${results.length}/${lib.length}. Policy: MP4 → GIF → none.
 * Re-run: node scripts/import-exercisedb-gifs.mjs
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

const BASE = '${BASE}';
const ATTR = 'Exercise GIFs (ExerciseDB-style)';
const SRC = 'https://github.com/mohamedatef90/exercise-library';

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
console.log(`Wrote ${results.length}/${lib.length} → ${outPath}`);
if (unmatched.length) {
  console.log('Unmatched:');
  for (const u of unmatched) console.log(`  ${u.id} (${u.nameEn})`);
}
