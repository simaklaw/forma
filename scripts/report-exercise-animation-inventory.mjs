import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PATHS = {
  home: 'apps/mobile/src/features/workout/bodyweightPlan.ts',
  gym: 'apps/mobile/src/features/workout/gymPlan.ts',
  rigModel: 'apps/mobile/src/features/workout/exerciseRigModel.ts',
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

function candidateMotionFamily(name, category = null, equipment = null) {
  const text = [name, category, equipment].filter(Boolean).join(' ').toLowerCase()
    .replace(/[–—]/g, '-');
  const rules = [
    { family: 'core-anti-rotation', rule: 'anti-rotation-name', pattern: /pallof|паллоф|anti[- ]?rotation|анти.?ротац/ },
    { family: 'shoulder-isolation', rule: 'shoulder-isolation-name', pattern: /lateral raise|front raise|reverse fly|face pull|external rotation|internal rotation|upright row|shrug|шраг|мах[иа] в стороны|подъ[её]мы? перед собой|разведени[ея].{0,24}(дельт|плеч|гантел|рук)|наружная ротация плеча|внутренняя ротация плеча|тяга к подбородку|face pulls?/ },
    { family: 'mobility-stretch', rule: 'mobility-stretch-name', pattern: /stretch|mobility|90\/90|wrist circles|hip circles|knee circles|neck exercise|растяж|круги|вращени[ея]|упражнен.*шеи|поворот.*шеи|мобилит/ },
    { family: 'core-stability-extension', rule: 'core-stability-name', pattern: /plank|side bridge|side plank|dead bug|superman|stomach vacuum|isometric neck|lower back curl|планка|мёртвый жук|мертвый жук|супермен|вакуум|боковой мост|боковая планка|разгибание поясницы/ },
    { family: 'core-dynamic-flexion-rotation', rule: 'core-dynamic-name', pattern: /crunch|sit[- ]?up|air bike|heel toucher|leg pull[- ]?in|russian twist|scissor kick|tuck crunch|oblique|toe toucher|скручив|велосипед \(пресс\)|подъ[её]м корпуса|локоть к колену|касани[ея] пяток|складк|подтягивание колен|ножниц[ыа]/ },
    { family: 'cardio-plyometric', rule: 'cardio-plyometric-name', pattern: /jump|lateral bound|skipping|spider crawl|groiners|fast skipping|star jump|rocket jump|standing long jump|plyo push|прыж|бег на месте|альпинист|гроинер|spider crawl/ },
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
  const pattern = /\{\s*id:\s*(\d+),\s*index:\s*\d+,\s*name:\s*'((?:\\.|[^'])*)'([\s\S]*?)\n\s{6}\}/g;
  let match;
  while ((match = pattern.exec(source)) !== null) {
    const extra = match[3];
    const mediaKey = /mediaKey:\s*'([^']+)'/.exec(extra);
    const searchTerm = /wgerSearchTerm:\s*'([^']+)'/.exec(extra);
    rows.push({
      mode,
      id: Number(match[1]),
      name: match[2].replace(/\\'/g, "'"),
      mediaKey: mediaKey ? mediaKey[1] : null,
      searchTerm: searchTerm ? searchTerm[1] : null
    });
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
const rigModelSource = read(PATHS.rigModel);
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

const pilotRegistryMatch = /const PILOT_RIGS: Record<number, ExerciseRigFamily> = \{([\s\S]*?)\n\};/.exec(rigModelSource);
if (!pilotRegistryMatch) throw new Error('Cannot read PILOT_RIGS from ' + PATHS.rigModel);
const pilotRegistryRows = [...pilotRegistryMatch[1].matchAll(/(\d+):\s*'([^']+)'/g)];
const pilotIds = pilotRegistryRows.map((match) => Number(match[1]));
if (new Set(pilotIds).size !== pilotIds.length) {
  throw new Error('PILOT_RIGS contains duplicate exercise IDs.');
}
const pilotFamilyByExerciseId = new Map(
  pilotRegistryRows.map((match) => [Number(match[1]), match[2]])
);
const coverageEntries = [
  ...planRows.map((row) => {
    const planMode = row.mode === 'Домашняя программа' ? 'home' : 'gym';
    const motionFamily = pilotFamilyByExerciseId.get(row.id) || null;
    const legacyMediaRights = motionFamily
      ? 'original-svg-prototype'
      : row.mediaKey && localVideoKeySet.has(row.mediaKey)
        ? 'bundled-media-movement-not-reviewed'
        : 'no-direct-bundled-video';
    const familyCandidate = candidateMotionFamily(row.name + ' ' + (row.searchTerm || ''));
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
      familyReviewStatus: motionFamily ? 'pending-device-review' : familyCandidate.confidence === 'unclassified' || familyCandidate.confidence === 'category-only-review' ? 'manual-review-required' : 'candidate-unreviewed',
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
      entry.equipment || null
    );
    const hasImageFolder = imageFolderBySlug.has(normalizeId(entry.id));
    const legacyMediaRights = hasManifestGif
      ? 'gymvisual-license-review'
      : hasOrphanGif
        ? 'excluded-wrong-match-do-not-display'
        : hasImageFolder
          ? 'yuhonas-unlicense-declared'
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
      familyReviewStatus: familyCandidate.confidence === 'unclassified' || familyCandidate.confidence === 'category-only-review' ? 'manual-review-required' : 'candidate-unreviewed',
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
    familyCandidateCounts,
    explicitMaleFemaleVariantStatus: true
  },
  rule: 'Only explicitly authored original rig prototypes are counted as animation coverage. Existing media keys and legacy images are tracked separately and do not count as verified exercise-accurate animations.',
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
  '- Реестр покрытия: `docs/EXERCISE_ANIMATION_COVERAGE.json` — ' + coverageEntries.length + ' stable IDs (' + planRows.length + ' плановых + ' + imported.length + ' импортированных), из них ' + coverageEntries.filter((entry) => entry.status === 'prototype').length + ' прототипа и ' + coverageEntries.filter((entry) => entry.status === 'not-started').length + ' ещё не выполнено.',
  '- Предварительное группирование: **' + Object.keys(familyCandidateCounts).length + '** семейств-кандидатов; все назначения помечены как непроверенные и не означают одобрение анимации или эквивалентности техники.',
  '- Распределение импортированного каталога по оборудованию: ' + Object.entries(equipmentCounts).map(([key, value]) => key + ': ' + value).join('; ') + '.',
  '- Старые локальные изображения: **' + imageFolders.length + '** папок и **' + imageFolders.reduce((sum, folder) => sum + folder.frames.length, 0) + '** JPG-кадров. Источник этих кадров — `yuhonas/free-exercise-db`, указанный как Unlicense/Public Domain в коммите импорта и в [LICENSE](https://github.com/yuhonas/free-exercise-db/blob/main/LICENSE.md). Папки, совпавшие с ID импортированного каталога: **' + imported.filter((entry) => imageFolderBySlug.has(normalizeId(entry.id))).length + ' из ' + imported.length + '**.',
  '- GIF-манифест: **' + gifManifest.length + '** записей, с localGifPath — **' + gifManifest.filter((entry) => entry.localGifPath).length + '**; локальных GIF-файлов — **' + gifFiles.length + '**; статических GIF require-записей — **' + gifModuleIds.length + '**.',
  '- GIF-реестр: **' + extraGifModuleIds.length + '** локальных файлов есть в Metro require, но нет в манифесте (' + (extraGifModuleIds.join(', ') || 'нет') + '); **' + manifestWithoutLocalAsset.length + '** записей манифеста не имеют соответствующего локального GIF-файла.',
  '- MP4-манифест: **' + videoManifest.length + '** записей; встроенных MP4-ключей — **' + bundledVideoKeys.length + '**.',
  '- В домашних упражнениях **' + home.filter((row) => row.mediaKey).length + ' из ' + home.length + '** имеют mediaKey, но ключи повторно используются между вариантами движений; соответствие ролика каждому упражнению нужно проверить. Для упражнений зала mediaKey в плане не задан.',
  '',
  '## Обнаруженные пробелы и риски',
  '',
  '1. Наличие JPG-кадров не означает наличие непрерывной анимации.',
  '2. Разные упражнения используют одни и те же видео-ключи. Каждый файл нужно сверить с техникой конкретного упражнения, прежде чем считать покрытие подтверждённым.',
  '3. Библиотека содержит ' + imported.length + ' упражнения, GIF-манифест — ' + gifManifest.length + ' записи, а папки JPG покрывают только часть импортированного каталога.',
  '4. Есть конкретное расхождение реестров: файлы `lib-band-hip-adductions.gif`, `lib-glute-kickback.gif` и `lib-side-bridge.gif` остаются среди физических assets/Metro require, но отсутствуют в GIF-манифесте (были исключены как неверные автосопоставления). Кроме того, 2 записи манифеста не имеют локального GIF пути. Перед заявлением об офлайн-покрытии сверить физические файлы, манифест и Metro require; не возвращать исключённые упражнения как корректное медиа без ручной проверки.',
  '5. Источники нужно разделять по лицензии. Старые JPG-кадры в `assets/exercise-library/` происходят из `yuhonas/free-exercise-db` и отмечены Unlicense/Public Domain в коммите импорта и [LICENSE](https://github.com/yuhonas/free-exercise-db/blob/main/LICENSE.md). Для `hasaneyldrm/exercises-dataset` MIT не распространяется на `images/` и `videos/`: эти медиа принадлежат Gym visual, NOTICE устанавливает атрибуцию `© Gym visual — https://gymvisual.com/` и ссылается на условия повторного использования ([LICENSE](https://github.com/hasaneyldrm/exercises-dataset/blob/main/LICENSE), [NOTICE](https://github.com/hasaneyldrm/exercises-dataset/blob/main/NOTICE.md)). Не считать GIF доступными для повторного распространения в APK без отдельной проверки/разрешения; вся новая графика и риг должны быть оригинальными.',
  '6. Старые медиа-манифесты не задают male/female-вариант для оригинального рига. Новый реестр покрытия добавляет явный статус обоих вариантов для всех ' + coverageEntries.length + ' stable ID; однако реальные оригинальные варианты существуют пока только у трёх прототипов, остальные 222 отмечены not-created.',
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
