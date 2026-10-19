import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PATHS = {
  home: 'apps/mobile/src/features/workout/bodyweightPlan.ts',
  gym: 'apps/mobile/src/features/workout/gymPlan.ts',
  imported: 'apps/mobile/src/features/workout/importedExerciseLibrary.generated.ts',
  gifManifest: 'apps/mobile/src/features/workout/exerciseGifManifest.generated.ts',
  videoManifest: 'apps/mobile/src/features/workout/exerciseVideoManifest.generated.ts',
  media: 'apps/mobile/src/features/workout/exerciseMedia.ts',
  gifModules: 'apps/mobile/src/features/workout/exerciseDatasetAssets.generated.ts',
  images: 'apps/mobile/assets/exercise-library',
  gifs: 'apps/mobile/assets/exercises/dataset',
  report: 'docs/EXERCISE_ANIMATION_INVENTORY.md',
  coverage: 'docs/EXERCISE_ANIMATION_COVERAGE.json'
};

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function parseExportedJsonArray(source, exportName) {
  const declaration = source.indexOf('export const ' + exportName);
  if (declaration < 0) throw new Error('Cannot find exported array ' + exportName);
  const equals = source.indexOf('=', declaration);
  const start = source.indexOf('[', equals);
  if (start < 0) throw new Error('Cannot find array opening bracket for ' + exportName);
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < source.length; i += 1) {
    const ch = source[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '[') depth += 1;
    else if (ch === ']') {
      depth -= 1;
      if (depth === 0) return JSON.parse(source.slice(start, i + 1));
    }
  }
  throw new Error('Unclosed JSON array ' + exportName);
}

function candidateMotionFamily(name, category = null, equipment = null, stableKey = null) {
  const text = [name, category, equipment].filter(Boolean).join(' ').toLowerCase()
    .replace(/[–—]/g, '-');
  const manualReviewOverrides = {
    'library:lib-band-hip-adductions': {
      family: 'hip-frontal-plane-control',
      confidence: 'manual-review-required',
      rule: 'source-conflict-name-adduction-vs-instruction-abduction',
      note: 'Название и основные мышцы указывают на приведение, но инструкции описывают отведение ноги наружу. Перед созданием анимации сверить исходную технику.'
    },
    'library:lib-side-leg-raises': {
      family: 'hip-abduction-balance',
      confidence: 'manual-review-required',
      rule: 'source-conflict-primary-muscle-vs-instructions',
      note: 'Инструкция описывает махи ногой в сторону стоя, но поле основных мышц указывает приводящие мышцы. Уточнить направление движения и исправить метаданные.'
    },
    'library:lib-vertical-swing': {
      family: 'hip-hinge-swing',
      confidence: 'manual-review-required',
      rule: 'source-conflict-equipment-description',
      note: 'Английская запись указывает гантель, русская инструкция — гирю. Подтвердить оборудование и исправить метаданные до привязки анимации.'
    }
  };
  if (stableKey && manualReviewOverrides[stableKey]) return manualReviewOverrides[stableKey];
  const rules = [
    { family: 'partner-resisted-isometric-stretch', rule: 'partner-resisted-isometric-name', pattern: /lying glute|seated glute|seated biceps|seated front deltoid|ягодичные лёжа|ягодичные сидя|сгибание рук на бицепс сидя|передняя дельта сидя/ },
    { family: 'core-pike-hip-flexion', rule: 'core-pike-name', pattern: /butt[- ]?ups|butt ups/ },
    { family: 'lateral-band-walk', rule: 'lateral-band-walk-name', pattern: /monster[- ]?walk|banded lateral walk|lateral band walk|ходьба с резинкой/ },
    { family: 'hip-flexion-knee-drive', rule: 'hip-flexion-name', pattern: /hip flexion with band|band hip flexion|сгибание бедра с резинкой/ },
    { family: 'hip-hinge-swing', rule: 'hip-hinge-swing-name', pattern: /kettlebell swing|dumbbell swing|vertical swing|махи? гирей|мах гирей|swing.*hip/ },
    { family: 'horizontal-push-lateral-shift', rule: 'horizontal-push-lateral-shift-name', pattern: /isometric wipers|изометрические.{0,16}дворники/ },
    { family: 'hip-frontal-plane-control', rule: 'hip-frontal-plane-name', pattern: /hip adduction|hip abduction|band hip adductions|side leg raises|side leg raise|мах ногой в сторону|приведение бедра/ },
    { family: 'core-anti-rotation', rule: 'anti-rotation-name', pattern: /pallof|паллоф|anti[- ]?rotation|анти.?ротац/ },
    { family: 'shoulder-isolation', rule: 'shoulder-isolation-name', pattern: /lateral raise|front raise|front.{0,18}(raise|deltoid)|reverse fly|band pull[- ]?apart|face pull|external rotation|internal rotation|upright row|shrug|шраг|мах[иа] в стороны|подъ[её]мы? перед собой|разведени[ея].{0,24}(дельт|плеч|гантел|рук)|наружная ротация плеча|внутренняя ротация плеча|тяга к подбородку|face pulls?/ },
    { family: 'mobility-stretch', rule: 'mobility-stretch-name', pattern: /stretch|mobility|90\/90|wrist circles|hip circles|knee circles|neck exercise|растяж|круги|вращени[ея]|упражнен.*шеи|поворот.*шеи|мобилит/ },
    { family: 'core-stability-extension', rule: 'core-stability-name', pattern: /plank|side bridge|side plank|dead bug|superman|stomach vacuum|isometric neck|lower back curl|планка|мёртвый жук|мертвый жук|супермен|вакуум|боковой мост|боковая планка|разгибание поясницы/ },
    { family: 'core-dynamic-flexion-rotation', rule: 'core-dynamic-name', pattern: /crunch|sit[- ]?up|air bike|heel toucher|leg pull[- ]?in|russian twist|scissor kick|tuck crunch|oblique|toe toucher|скручив|велосипед \(пресс\)|подъ[её]м корпуса|локоть к колену|касани[ея] пяток|складк|подтягивание колен|ножниц[ыа]/ },
    { family: 'cardio-plyometric', rule: 'cardio-plyometric-name', pattern: /jump|butt kick|lateral bound|skipping|spider crawl|groiners|fast skipping|star jump|rocket jump|standing long jump|plyo push|прыж|бег на месте|альпинист|гроинер|spider crawl/ },
    { family: 'hip-extension-bridge', rule: 'hip-extension-name', pattern: /glute bridge|hip thrust|butt lift|glute kickback|hip extension|hip raise|single[- ]leg glute bridge|rear leg raise|ягодичн.*мост|мостик с опорой|отведение ноги назад|разгибание бедра|мах ногой назад|подъём таза|подъем таза|отведение бедра/ },
    { family: 'lower-body-machine-isolation', rule: 'lower-body-machine-name', pattern: /leg press|leg extension|leg curl|calf raise|standing calf|жима? ногами|разгибания ног|сгибания ног|подъ[её]мы? на носки|икр[ыа]/ },
    { family: 'hip-hinge-deadlift', rule: 'hip-hinge-name', pattern: /deadlift|romanian deadlift|good morning|pull-through|hip hinge|kettlebell swing|stiff-legged|становая тяга|румынская тяга|тяга на прямых ногах|наклоны со штангой|наклоны с резинкой|гуд морнинг|протяжка на блоке между ног/ },
    { family: 'squat-knee-dominant', rule: 'squat-name', pattern: /squat|приседан|гакк-присед|гоблет-присед/ },
    { family: 'lunge-step-up', rule: 'lunge-step-name', pattern: /lunge|split squat|step[- ]?up|bulgarian|выпад|болгарские|зашагив/ },
    { family: 'vertical-push', rule: 'vertical-push-name', pattern: /shoulder press|overhead press|military press|arnold press|handstand push|жим над головой|жим гантелей сидя|армейский жим|жим арнольда|армейск.*жим|жим стоя|жим вверх/ },
    { family: 'horizontal-push', rule: 'horizontal-push-name', pattern: /bench press|chest press|push[- ]?up|pushups?|dips|flyes|butterfly|crossover|cross-over|isometric chest squeeze|отжиман|жим штанги лёжа|жим штанги лежа|жим гантелей лёжа|жим гантелей лежа|жим в тренажёре|жим в тренажере|жим гантелей на наклонной|разведения гантелей лёжа|разведения гантелей лежа|сведение в тренажёре|сведение в тренажере|кроссовер/ },
    { family: 'vertical-pull', rule: 'vertical-pull-name', pattern: /pull[- ]?up|pullups?|chin[- ]?up|lat pulldown|wide[- ]grip lat|pulldown|pull down|подтягиван|тяга верхнего блока/ },
    { family: 'horizontal-pull', rule: 'horizontal-pull-name', pattern: /row|seated cable rows|bent[- ]over barbell row|тяга с резиной|тяга штанги в наклоне|тяга гантели в наклоне|тяга горизонтального блока|тяга к лицу/ },
    { family: 'arm-elbow-flexion', rule: 'elbow-flexion-name', pattern: /biceps curl|hammer curl|barbell curl|dumbbell curl|concentration curl|preacher curl|curl(?![- ]?up)|сгибания.*(бицепс|рук|гантел|штанг)|молотков|концентрированн.*сгибан/ },
    { family: 'arm-elbow-extension', rule: 'elbow-extension-name', pattern: /triceps|pushdown|skullcrusher|overhead triceps|french press|elbow extension|разгибани.*трицепс|французский жим|разгибания на блоке|отжимания на трицепс|разгибание гантели из-за головы/ }
  ];
  for (const item of rules) {
    if (item.pattern.test(text)) {
      return { family: item.family, confidence: 'name-rule-unreviewed', rule: item.rule };
    }
  }
  const fallbackByCategory = {
    abs: 'core-candidate-review',
    legs: 'lower-body-candidate-review',
    glutes: 'hip-extension-candidate-review',
    chest: 'horizontal-push-candidate-review',
    back: 'pull-candidate-review',
    arms: 'arm-isolation-candidate-review'
  };
  if (category && fallbackByCategory[category]) {
    return { family: fallbackByCategory[category], confidence: 'category-only-review', rule: 'catalog-category-fallback' };
  }
  return { family: 'manual-classification-required', confidence: 'unclassified', rule: 'no-safe-rule-match' };
}

function parsePlan(source, mode) {
  const rows = [];
  const pattern = /\{\s*id:\s*(\d+),\s*index:\s*\d+,\s*name:\s*(?:'((?:\\.|[^'])*)'|"((?:\\.|[^"])*)")([\s\S]*?)\n\s{6}\}/g;
  const exerciseObjectCount = [...source.matchAll(/\{\s*id:\s*\d+,\s*index:\s*\d+,\s*name\s*:/g)].length;
  let match;
  while ((match = pattern.exec(source)) !== null) {
    const extra = match[4];
    const mediaKey = /mediaKey:\s*(?:'([^']+)'|"([^"]+)")/.exec(extra);
    const searchTerm = /wgerSearchTerm:\s*(?:'([^']+)'|"([^"]+)")/.exec(extra);
    const rawName = match[2] ?? match[3];
    rows.push({
      mode,
      id: Number(match[1]),
      name: rawName.replace(/\\(['"\\])/g, '$1'),
      mediaKey: mediaKey ? mediaKey[1] ?? mediaKey[2] : null,
      searchTerm: searchTerm ? searchTerm[1] ?? searchTerm[2] : null
    });
  }
  if (rows.length !== exerciseObjectCount) {
    throw new Error(
      'Parsed ' + rows.length + ' exercises but found ' + exerciseObjectCount +
      ' plan exercise IDs for ' + mode + '; fix parsePlan instead of publishing an incomplete inventory'
    );
  }
  if (!rows.length) throw new Error('No workout exercises parsed for ' + mode);
  return rows;
}

function listFiles(directory, predicate) {
  const absolute = path.join(ROOT, directory);
  if (!fs.existsSync(absolute)) return [];
  const output = [];
  const visit = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const target = path.join(current, entry.name);
      if (entry.isDirectory()) visit(target);
      else {
        const relative = path.relative(ROOT, target).split(path.sep).join('/');
        if (predicate(relative)) output.push(relative);
      }
    }
  };
  visit(absolute);
  return output;
}

function scanImageFolders() {
  const absolute = path.join(ROOT, PATHS.images);
  if (!fs.existsSync(absolute)) return [];
  return fs.readdirSync(absolute, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const folder = path.join(absolute, entry.name);
      const frames = ['0.jpg', '1.jpg'].filter((name) => fs.existsSync(path.join(folder, name)));
      return { slug: entry.name, frames };
    })
    .filter((entry) => entry.frames.length > 0)
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

const home = parsePlan(read(PATHS.home), 'Домашняя программа');
const gym = parsePlan(read(PATHS.gym), 'Зал');
const planRows = [...home, ...gym].sort((a, b) => a.id - b.id || a.mode.localeCompare(b.mode));
const imported = parseExportedJsonArray(read(PATHS.imported), 'IMPORTED_EXERCISE_LIBRARY');
const gifManifest = parseExportedJsonArray(read(PATHS.gifManifest), 'EXERCISE_GIF_MANIFEST');
const videoManifest = parseExportedJsonArray(read(PATHS.videoManifest), 'EXERCISE_VIDEO_MANIFEST');
const gifModuleSource = read(PATHS.gifModules);
const gifModuleIds = [...gifModuleSource.matchAll(/'([^']+)':\s*require\([^)]*\.gif'\)/g)].map((match) => match[1]);
const mediaSource = read(PATHS.media);
const bundledVideoKeys = [...mediaSource.matchAll(/^\s*(['a-z][^']*'|[a-z][a-z0-9-]*):\s*require\([^)]*\.mp4'\)/gm)]
  .map((match) => match[1].replace(/'/g, ''));
const imageFolders = scanImageFolders();
const imageFolderBySlug = new Map(imageFolders.map((item) => [item.slug, item]));
const gifFiles = listFiles(PATHS.gifs, (name) => name.toLowerCase().endsWith('.gif'));
const gifManifestById = new Map(gifManifest.map((entry) => [entry.id, entry]));
const extraGifModuleIds = gifModuleIds.filter((id) => !gifManifestById.has(id));
const manifestWithoutLocalAsset = gifManifest.filter((entry) =>
  !entry.localGifPath || !fs.existsSync(path.join(ROOT, PATHS.gifs, entry.id + '.gif'))
);
const normalizeId = (id) => id.replace(/^lib-/, '').toLowerCase();
const localVideoKeySet = new Set(bundledVideoKeys);
const uniquePlans = new Map();
for (const row of planRows) if (!uniquePlans.has(row.id)) uniquePlans.set(row.id, row);
const reusedKeys = new Map();
for (const row of planRows.filter((entry) => entry.mediaKey)) {
  if (!reusedKeys.has(row.mediaKey)) reusedKeys.set(row.mediaKey, []);
  reusedKeys.get(row.mediaKey).push(row);
}
let revision = process.env.GITHUB_SHA || 'not supplied';
if (revision === 'not supplied') {
  try { revision = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(); }
  catch { /* Report still works outside a Git checkout. */ }
}

const equipmentCounts = imported.reduce((out, entry) => {
  out[entry.equipment] = (out[entry.equipment] || 0) + 1;
  return out;
}, {});
const planRowsMarkdown = planRows.map((row) => {
  const hasKey = row.mediaKey && localVideoKeySet.has(row.mediaKey);
  return '| ' + row.mode + ' | ' + row.id + ' | ' + row.name + ' | ' + (row.mediaKey || '—') + ' | ' +
    (hasKey ? 'Есть ключ; соответствие движению требует проверки' : 'Нет прямого встроенного видео-ключа') + ' |';
}).join('\n');
const importedRowsMarkdown = imported.map((entry) => {
  const image = imageFolderBySlug.get(normalizeId(entry.id));
  const gif = gifManifestById.get(entry.id);
  const expectedGif = PATHS.gifs + '/' + entry.id + '.gif';
  const localGif = gif && gif.localGifPath && fs.existsSync(path.join(ROOT, expectedGif));
  return '| ' + entry.id + ' | ' + (entry.nameRu || entry.nameEn) + ' | ' + entry.nameEn + ' | ' +
    entry.equipment + ' | ' + (image ? String(image.frames.length) + ' JPG' : 'нет JPG-папки') + ' | ' +
    (localGif ? 'локальный GIF' : gif ? 'есть в манифесте, локальный файл не найден' : 'нет GIF в манифесте') + ' |';
}).join('\n');
const reusedKeysMarkdown = [...reusedKeys.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  .map(([key, rows]) => '| ' + key + ' | ' + rows.length + ' | ' + rows.map((row) => row.name + ' (#' + row.id + ')').join('; ') + ' |')
  .join('\n');

// The previous hand-drawn SVG pilot was rejected after physical-device review.
 // Do not count it as exercise-media coverage or let numeric ID collisions select it.
 const pilotFamilyByExerciseId = new Map();
const coverageEntries = [
  ...planRows.map((row) => {
    const planMode = row.mode === 'Домашняя программа' ? 'home' : 'gym';
    const motionFamily = pilotFamilyByExerciseId.get(row.id) || null;
    const legacyMediaRights = motionFamily
      ? 'original-svg-prototype'
      : row.mediaKey && localVideoKeySet.has(row.mediaKey)
        ? 'bundled-media-movement-not-reviewed'
        : 'no-direct-bundled-video';
    const familyCandidate = candidateMotionFamily(row.name + ' ' + (row.searchTerm || ''), null, null, 'plan:' + planMode + ':' + row.id);
    return {
      key: 'plan:' + planMode + ':' + row.id,
      source: 'plan',
      planMode,
      stableId: String(row.id),
      numericId: row.id,
      nameRu: row.name,
      nameEn: null,
      motionFamily,
      motionFamilyCandidate: familyCandidate.family,
      familyClassificationConfidence: familyCandidate.confidence,
      familyClassificationRule: familyCandidate.rule,
      familyReviewNote: familyCandidate.note || null,
      familyReviewStatus: motionFamily ? 'pending-device-review' : familyCandidate.confidence === 'unclassified' || familyCandidate.confidence === 'category-only-review' || familyCandidate.confidence === 'manual-review-required' ? 'manual-review-required' : 'candidate-unreviewed',
      status: motionFamily ? 'prototype' : 'not-started',
      maleVariant: motionFamily ? 'original-svg-prototype' : 'not-created',
      femaleVariant: motionFamily ? 'original-svg-prototype' : 'not-created',
      offlineOriginalAnimation: Boolean(motionFamily),
      legacyImageFolder: false,
      legacyGifStatus: 'not-used-for-plan-preview',
      currentMediaKey: row.mediaKey,
      legacyMediaRights
    };
  }),
  ...imported.map((entry, index) => {
    const hasManifestGif = gifManifestById.has(entry.id);
    const hasOrphanGif = gifModuleIds.includes(entry.id) && !hasManifestGif;
    const familyCandidate = candidateMotionFamily(
      (entry.nameEn || '') + ' ' + (entry.nameRu || ''),
      entry.category || null,
      entry.equipment || null,
      'library:' + entry.id
    );
    const hasImageFolder = imageFolderBySlug.has(normalizeId(entry.id));
    const legacyMediaRights = hasManifestGif
      ? 'gymvisual-license-review'
      : hasOrphanGif
        ? 'excluded-wrong-match-do-not-display'
        : hasImageFolder
          ? 'yuhonas-attribution-preserved-rights-unverified'
          : 'no-mapped-legacy-media';
    return {
      key: 'library:' + entry.id,
      source: 'imported-library',
      planMode: null,
      stableId: entry.id,
      numericId: 100001 + index,
      nameRu: entry.nameRu || entry.nameEn,
      nameEn: entry.nameEn,
      motionFamily: null,
      motionFamilyCandidate: familyCandidate.family,
      familyClassificationConfidence: familyCandidate.confidence,
      familyClassificationRule: familyCandidate.rule,
      familyReviewNote: familyCandidate.note || null,
      familyReviewStatus: familyCandidate.confidence === 'unclassified' || familyCandidate.confidence === 'category-only-review' || familyCandidate.confidence === 'manual-review-required' ? 'manual-review-required' : 'candidate-unreviewed',
      status: 'not-started',
      maleVariant: 'not-created',
      femaleVariant: 'not-created',
      offlineOriginalAnimation: false,
      legacyImageFolder: Boolean(hasImageFolder),
      legacyGifStatus: hasManifestGif ? 'manifest-license-review' : hasOrphanGif ? 'excluded-wrong-match' : 'not-mapped',
      currentMediaKey: null,
      legacyMediaRights
    };
  })
];
const expectedFamilyAssignments = {
  'plan:home:10': 'horizontal-push',
  'plan:home:13': 'squat-knee-dominant',
  'plan:gym:5': 'vertical-push',
  'library:lib-band-pull-apart': 'shoulder-isolation',
  'library:lib-butt-ups': 'core-pike-hip-flexion',
  'library:lib-double-leg-butt-kick': 'cardio-plyometric',
  'library:lib-hip-flexion-with-band': 'hip-flexion-knee-drive',
  'library:lib-isometric-wipers': 'horizontal-push-lateral-shift',
  'library:lib-monster-walk': 'lateral-band-walk',
  'library:lib-seated-biceps': 'partner-resisted-isometric-stretch',
  'library:lib-seated-front-deltoid': 'partner-resisted-isometric-stretch',
  'library:lib-seated-glute': 'partner-resisted-isometric-stretch',
  'library:lib-single-leg-butt-kick': 'cardio-plyometric',
  'library:lib-front-dumbbell-raise': 'shoulder-isolation'
};
for (const [key, expectedFamily] of Object.entries(expectedFamilyAssignments)) {
  const entry = coverageEntries.find((row) => row.key === key);
  if (!entry || entry.motionFamilyCandidate !== expectedFamily) {
    throw new Error('Exercise family classification mismatch for ' + key + ': expected ' +
      expectedFamily + ', got ' + (entry ? entry.motionFamilyCandidate : 'missing'));
  }
}
const expectedManualReview = {
  'library:lib-band-hip-adductions': 'source-conflict-name-adduction-vs-instruction-abduction',
  'library:lib-side-leg-raises': 'source-conflict-primary-muscle-vs-instructions',
  'library:lib-vertical-swing': 'source-conflict-equipment-description'
};
for (const [key, expectedRule] of Object.entries(expectedManualReview)) {
  const entry = coverageEntries.find((row) => row.key === key);
  if (!entry || entry.familyClassificationConfidence !== 'manual-review-required' ||
      entry.familyReviewStatus !== 'manual-review-required' ||
      entry.familyClassificationRule !== expectedRule || !entry.familyReviewNote) {
    throw new Error('Ambiguous exercise must remain explicitly blocked for manual review: ' + key);
  }
}

const familyCandidateCounts = coverageEntries.reduce((out, entry) => {
  out[entry.motionFamilyCandidate] = (out[entry.motionFamilyCandidate] || 0) + 1;
  return out;
}, {});
const familyCandidateMarkdown = Object.entries(familyCandidateCounts)
  .sort((a, b) => a[0].localeCompare(b[0]))
  .map(([family, count]) => {
    const examples = coverageEntries
      .filter((entry) => entry.motionFamilyCandidate === family)
      .slice(0, 4)
      .map((entry) => entry.nameRu + ' (' + entry.stableId + ')')
      .join('; ');
    return '| ' + family + ' | ' + count + ' | ' + examples + ' |';
  })
  .join('\n');

const coverageKeys = new Set(coverageEntries.map((entry) => entry.key));
if (uniquePlans.size !== planRows.length) {
  throw new Error('Workout plan IDs are not unique; resolve collisions before producing the coverage registry.');
}
if (coverageEntries.length !== planRows.length + imported.length) {
  throw new Error('Coverage registry does not include every plan/library entry.');
}
if (coverageKeys.size !== coverageEntries.length) {
  throw new Error('Coverage registry contains duplicate stable keys.');
}
if (coverageEntries.filter((entry) => entry.status === 'prototype').length !== pilotFamilyByExerciseId.size) {
  throw new Error('Coverage registry prototype count does not match PILOT_RIGS.');
}
if (coverageEntries.some((entry) => !entry.maleVariant || !entry.femaleVariant)) {
  throw new Error('Every coverage record must contain explicit male and female variant statuses.');
}
if (coverageEntries.some((entry) => !entry.motionFamilyCandidate || !entry.familyReviewStatus)) {
  throw new Error('Every coverage record must have a candidate motion family and an explicit review status.');
}
const familyRuleExamples = [
  { mode: 'gym', id: 1, family: 'squat-knee-dominant' },
  { mode: 'gym', id: 2, family: 'hip-hinge-deadlift' },
  { mode: 'gym', id: 4, family: 'horizontal-push' },
  { mode: 'gym', id: 5, family: 'vertical-push' },
  { mode: 'gym', id: 6, family: 'arm-elbow-extension' },
  { mode: 'gym', id: 7, family: 'horizontal-pull' },
  { mode: 'gym', id: 8, family: 'vertical-pull' },
  { mode: 'gym', id: 9, family: 'arm-elbow-flexion' },
  { mode: 'home', id: 13, family: 'squat-knee-dominant' },
  { mode: 'home', id: 14, family: 'lunge-step-up' },
  { mode: 'home', id: 15, family: 'core-stability-extension' },
  { mode: 'home', id: 53, family: 'core-dynamic-flexion-rotation' }
];
for (const sample of familyRuleExamples) {
  const entry = coverageEntries.find((candidate) =>
    candidate.source === 'plan' && candidate.planMode === sample.mode && candidate.numericId === sample.id
  );
  if (!entry || entry.motionFamilyCandidate !== sample.family) {
    throw new Error('Motion-family candidate classification changed unexpectedly for ' + sample.mode + ' exercise ' + sample.id);
  }
}

const coverageJson = JSON.stringify({
  schemaVersion: 1,
  summary: {
    planEntries: planRows.length,
    uniquePlanIds: uniquePlans.size,
    importedLibraryEntries: imported.length,
    totalEntries: coverageEntries.length,
    originalRigPrototypeEntries: coverageEntries.filter((entry) => entry.status === 'prototype').length,
    entriesWithoutRig: coverageEntries.filter((entry) => entry.status === 'not-started').length,
    candidateMotionFamilyGroups: Object.keys(familyCandidateCounts).length,
    entriesPendingFamilyReview: coverageEntries.filter((entry) => entry.familyReviewStatus !== 'pending-device-review').length,
    entriesRequiringManualClassification: coverageEntries.filter((entry) => entry.familyReviewStatus === 'manual-review-required').length,
    familyCandidateCounts,
    legacyImageFolders: imageFolders.length,
    legacyImageFrames: imageFolders.reduce((sum, folder) => sum + folder.frames.length, 0),
    localGifFiles: gifFiles.length,
    gifManifestEntries: gifManifest.length,
    gifManifestEntriesWithLocalPath: gifManifest.filter((entry) => entry.localGifPath).length,
    metroGifRequireEntries: gifModuleIds.length,
    extraMetroGifRequireEntries: extraGifModuleIds.length,
    manifestEntriesWithoutLocalGif: manifestWithoutLocalAsset.length,
    videoManifestEntries: videoManifest.length,
    bundledVideoKeys: bundledVideoKeys.length,
    explicitMaleFemaleVariantStatus: true
  },
  rule: 'No new animation is currently approved as exercise-accurate coverage. Existing videos, GIFs and legacy images are tracked separately and do not count as newly verified animation coverage.',
  entries: coverageEntries
}, null, 2) + '\n';

const report = [
  '# Инвентаризация библиотеки анимаций FitPulse',
  '',
  'Снимок исходников: ветка и ревизия, на которой запущен скрипт: ' + revision + '.',
  'Пересоздать отчёт: node scripts/report-exercise-animation-inventory.mjs --write.',
  '',
  '## Итог',
  '',
  '- Домашний план: **' + home.length + '** записей упражнений.',
  '- План зала: **' + gym.length + '** записей упражнений.',
  '- Всего: **' + planRows.length + '** записей плана, **' + uniquePlans.size + '** уникальных числовых ID и **' + new Set([...uniquePlans.values()].map((row) => row.name)).size + '** уникальных названий.',
  '- Импортированный каталог: **' + imported.length + '** упражнений; с русским названием — **' + imported.filter((entry) => entry.nameRu).length + '**; с русскими инструкциями — **' + imported.filter((entry) => entry.instructionsRu && entry.instructionsRu.length).length + '**.',
  '- Реестр покрытия: `docs/EXERCISE_ANIMATION_COVERAGE.json` — ' + coverageEntries.length + ' stable IDs (' + planRows.length + ' плановых + ' + imported.length + ' импортированных), из них ' + coverageEntries.filter((entry) => entry.status === 'prototype').length + ' одобренных новых анимаций и ' + coverageEntries.filter((entry) => entry.status === 'not-started').length + ' ещё не выполнено.',
  '- Предварительное группирование: **' + Object.keys(familyCandidateCounts).length + '** семейств-кандидатов; **' + coverageEntries.filter((entry) => entry.familyReviewStatus === 'manual-review-required').length + '** записей требуют ручной классификации из-за недостатка данных или конфликтов в источнике. Все остальные назначения также непроверенные и не означают одобрение анимации или эквивалентности техники.',
  '- Распределение импортированного каталога по оборудованию: ' + Object.entries(equipmentCounts).map(([key, value]) => key + ': ' + value).join('; ') + '.',
   '- Старые локальные изображения: **' + imageFolders.length + '** папок и **' + imageFolders.reduce((sum, folder) => sum + folder.frames.length, 0) + '** JPG-кадров. Происхождение по истории импорта — \`yuhonas/free-exercise-db\`; репозиторий заявляет Unlicense/Public Domain ([LICENSE](https://github.com/yuhonas/free-exercise-db/blob/main/LICENSE.md)), однако права на конкретные JPG, включённые в текущий проект, отдельно не подтверждены. Атрибуция источника сохраняется; права отмечены как непроверенные. Папки, совпавшие с ID импортированного каталога: **' + imported.filter((entry) => imageFolderBySlug.has(normalizeId(entry.id))).length + ' из ' + imported.length + '**.',
  '- GIF-манифест: **' + gifManifest.length + '** записей, с localGifPath — **' + gifManifest.filter((entry) => entry.localGifPath).length + '**; локальных GIF-файлов — **' + gifFiles.length + '**; статических GIF require-записей — **' + gifModuleIds.length + '**.',
  '- GIF-реестр: **' + extraGifModuleIds.length + '** локальных файлов есть в Metro require, но нет в манифесте (' + (extraGifModuleIds.join(', ') || 'нет') + '); **' + manifestWithoutLocalAsset.length + '** записей манифеста не имеют соответствующего локального GIF-файла.',
  '- MP4-манифест: **' + videoManifest.length + '** записей; встроенных MP4-ключей — **' + bundledVideoKeys.length + '**.',
  '- В домашних упражнениях **' + home.filter((row) => row.mediaKey).length + ' из ' + home.length + '** имеют mediaKey, и ключи повторно используются между вариантами. Теперь приложение воспроизводит MP4/GIF только при точном совпадении канонического термина с ключом; похожие варианты без проверенного совпадения не получают чужой ролик. Для упражнений зала mediaKey в плане не задан.',
  '',
  '## Исправление назначения медиа после теста на телефоне',
  '',
  '- Ранее один mediaKey применялся к нескольким разным движениям: обычные отжимания и узкие/наклонные отжимания; подтягивания и австралийская тяга; выпады и болгарские выпады/зашагивания; планка и скручивания; мостик и отведение ноги назад.',
  '- Теперь встроенное MP4/GIF используется только при точном совпадении канонического английского термина упражнения с назначением медиа-ключа. Похожие названия не считаются эквивалентом.',
  '- Для постера сначала ищется изображение конкретного импортированного ID или точный slug; общий постер разрешён только для канонического термина. Если точного локального материала нет, показывается удалённый постер (когда доступен) или честный fallback, а не чужая техника.',
  '- Это устраняет часть ошибочных назначений, но **не** создаёт анимации для всех упражнений и не подтверждает совместимость пола персонажа с режимом профиля.',
  '',
  '## Обнаруженные пробелы и риски',
  '',
  '1. Наличие JPG-кадров не означает наличие непрерывной анимации.',
  '2. Разные упражнения могут наследовать один legacy mediaKey, но приложение больше не использует его как достаточное основание для воспроизведения: требуется точное каноническое совпадение термина.',
  '3. Библиотека содержит ' + imported.length + ' упражнения, GIF-манифест — ' + gifManifest.length + ' записи, а папки JPG покрывают только часть импортированного каталога.',
  '4. Есть конкретное расхождение реестров: файлы `lib-band-hip-adductions.gif`, `lib-glute-kickback.gif` и `lib-side-bridge.gif` остаются среди физических assets/Metro require, но отсутствуют в GIF-манифесте (были исключены как неверные автосопоставления). Кроме того, 2 записи манифеста не имеют локального GIF пути. Перед заявлением об офлайн-покрытии сверить физические файлы, манифест и Metro require; не возвращать исключённые упражнения как корректное медиа без ручной проверки.',
   '5. Источники нужно разделять по лицензии. История импорта связывает JPG-кадры в \`assets/exercise-library/\` с \`yuhonas/free-exercise-db\`, чей репозиторий заявляет Unlicense/Public Domain ([LICENSE](https://github.com/yuhonas/free-exercise-db/blob/main/LICENSE.md)); права на конкретные JPG в текущем проекте остаются непроверенными, атрибуция источника сохранена. Для \`hasaneyldrm/exercises-dataset\` MIT не распространяется на \`images/\` и \`videos/\`: эти медиа принадлежат Gym visual, NOTICE устанавливает атрибуцию \`© Gym visual — https://gymvisual.com/\` и ссылается на условия повторного использования ([LICENSE](https://github.com/hasaneyldrm/exercises-dataset/blob/main/LICENSE), [NOTICE](https://github.com/hasaneyldrm/exercises-dataset/blob/main/NOTICE.md)). Не считать GIF доступными для повторного распространения в APK без отдельной проверки/разрешения; вся новая графика и риг должны быть оригинальными.',
  '6. Текущие MP4/GIF не имеют систематически проверенной мужской/женской пары для каждого упражнения. Реестр явно отмечает половые варианты для всех ' + coverageEntries.length + ' stable ID, но все 225 записей остаются not-created для новой одобренной анимации.',
  '7. Записи, заблокированные на ручную проверку: ' + coverageEntries.filter((entry) => entry.familyReviewStatus === 'manual-review-required').map((entry) => '**' + entry.nameRu + '** (' + entry.stableId + '): ' + entry.familyReviewNote).join(' ') + '.',
  '',
  '## Ключи видео, назначенные упражнениям повторно',
  '',
  '| Ключ | Назначений | Упражнения плана |',
  '|---|---:|---|',
  reusedKeysMarkdown || '| — | 0 | Нет |',
  '',
  '## Предварительные семейства движений (эвристика, нужна ручная проверка)',
  '',
  'Кандидатные группы помогают спланировать повторное использование рига, но **не являются утверждённой биомеханической картой** и не считаются анимационным покрытием.',
  '',
  '| Семейство-кандидат | Записей | Примеры |',
  '|---|---:|---|',
  familyCandidateMarkdown,
  '',
  '## Все упражнения домашних и заловых планов',
  '',
  '| Режим | ID | Название | mediaKey | Состояние инвентаризации |',
  '|---|---:|---|---|---|',
  planRowsMarkdown,
  '',
  '## Полный импортированный каталог',
  '',
  '| Stable ID | Название RU | Название EN | Оборудование | JPG-кадры | GIF |',
  '|---|---|---|---|---|---|',
  importedRowsMarkdown,
  '',
  '## Критерии готовности',
  '',
  '- Каждый числовой ID и каждый lib-* ID учтён.',
  '- Для каждой записи раздельно отмечены иллюстрация, локальная анимация, источник/лицензия и статус проверки движения.',
  '- Повторное использование одного ключа явно видно; оно не считается доказательством правильной демонстрации.',
  '- Полное покрытие утверждается только после сверки всех ID, файлов, мужского/женского варианта и офлайн-проигрывания на Android.',
  ''
].join('\n');

if (process.argv.includes('--write')) {
  fs.mkdirSync(path.dirname(path.join(ROOT, PATHS.report)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, PATHS.report), report);
  fs.writeFileSync(path.join(ROOT, PATHS.coverage), coverageJson);
  console.log('Wrote ' + PATHS.report);
  console.log('Wrote ' + PATHS.coverage);
} else {
  console.log(report);
}
console.log(JSON.stringify({
  planEntries: planRows.length,
  uniquePlanIds: uniquePlans.size,
  importedExercises: imported.length,
  imageFolders: imageFolders.length,
  localGifFiles: gifFiles.length,
  gifManifestEntries: gifManifest.length,
  videoManifestEntries: videoManifest.length,
  bundledVideoKeys: bundledVideoKeys.length
}, null, 2));
