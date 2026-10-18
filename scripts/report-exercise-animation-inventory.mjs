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
  report: 'docs/EXERCISE_ANIMATION_INVENTORY.md'
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
      else if (ch === '\\\\') escaped = true;
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

function parsePlan(source, mode) {
  const rows = [];
  const pattern = /\\{\\s*id:\\s*(\\d+),\\s*index:\\s*\\d+,\\s*name:\\s*'((?:\\\\.|[^'])*)'([\\s\\S]*?)\\n\\s{6}\\}/g;
  let match;
  while ((match = pattern.exec(source)) !== null) {
    const extra = match[3];
    const mediaKey = /mediaKey:\\s*'([^']+)'/.exec(extra);
    const searchTerm = /wgerSearchTerm:\\s*'([^']+)'/.exec(extra);
    rows.push({
      mode,
      id: Number(match[1]),
      name: match[2].replace(/\\\\'/g, "'"),
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
const gifModuleIds = [...gifModuleSource.matchAll(/'([^']+)':\\s*require\\([^)]*\\.gif'\\)/g)].map((match) => match[1]);
const mediaSource = read(PATHS.media);
const bundledVideoKeys = [...mediaSource.matchAll(/^\\s*(['a-z][^']*'|[a-z][a-z0-9-]*):\\s*require\\([^)]*\\.mp4'\\)/gm)]
  .map((match) => match[1].replace(/'/g, ''));
const imageFolders = scanImageFolders();
const imageFolderBySlug = new Map(imageFolders.map((item) => [item.slug, item]));
const gifFiles = listFiles(PATHS.gifs, (name) => name.toLowerCase().endsWith('.gif'));
const gifManifestById = new Map(gifManifest.map((entry) => [entry.id, entry]));
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
}).join('\\n');
const importedRowsMarkdown = imported.map((entry) => {
  const image = imageFolderBySlug.get(normalizeId(entry.id));
  const gif = gifManifestById.get(entry.id);
  const expectedGif = PATHS.gifs + '/' + entry.id + '.gif';
  const localGif = gif && gif.localGifPath && fs.existsSync(path.join(ROOT, expectedGif));
  return '| ' + entry.id + ' | ' + (entry.nameRu || entry.nameEn) + ' | ' + entry.nameEn + ' | ' +
    entry.equipment + ' | ' + (image ? String(image.frames.length) + ' JPG' : 'нет JPG-папки') + ' | ' +
    (localGif ? 'локальный GIF' : gif ? 'есть в манифесте, локальный файл не найден' : 'нет GIF в манифесте') + ' |';
}).join('\\n');
const reusedKeysMarkdown = [...reusedKeys.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  .map(([key, rows]) => '| ' + key + ' | ' + rows.length + ' | ' + rows.map((row) => row.name + ' (#' + row.id + ')').join('; ') + ' |')
  .join('\\n');

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
  '- Распределение импортированного каталога по оборудованию: ' + Object.entries(equipmentCounts).map(([key, value]) => key + ': ' + value).join('; ') + '.',
  '- Старые локальные изображения: **' + imageFolders.length + '** папок и **' + imageFolders.reduce((sum, folder) => sum + folder.frames.length, 0) + '** JPG-кадров. Папки, совпавшие с ID импортированного каталога: **' + imported.filter((entry) => imageFolderBySlug.has(normalizeId(entry.id))).length + ' из ' + imported.length + '**.',
  '- GIF-манифест: **' + gifManifest.length + '** записей, с localGifPath — **' + gifManifest.filter((entry) => entry.localGifPath).length + '**; локальных GIF-файлов — **' + gifFiles.length + '**; статических GIF require-записей — **' + gifModuleIds.length + '**.',
  '- MP4-манифест: **' + videoManifest.length + '** записей; встроенных MP4-ключей — **' + bundledVideoKeys.length + '**.',
  '- В домашних упражнениях **' + home.filter((row) => row.mediaKey).length + ' из ' + home.length + '** имеют mediaKey, но ключи повторно используются между вариантами движений; соответствие ролика каждому упражнению нужно проверить. Для упражнений зала mediaKey в плане не задан.',
  '',
  '## Обнаруженные пробелы и риски',
  '',
  '1. Наличие JPG-кадров не означает наличие непрерывной анимации.',
  '2. Разные упражнения используют одни и те же видео-ключи. Каждый файл нужно сверить с техникой конкретного упражнения, прежде чем считать покрытие подтверждённым.',
  '3. Библиотека содержит ' + imported.length + ' упражнения, GIF-манифест — ' + gifManifest.length + ' записи, а папки JPG покрывают только часть импортированного каталога.',
  '4. Сверять нужно три источника GIF: физические файлы, манифест и статические Metro require. Несовпадения должны быть устранены до заявления об офлайн-покрытии.',
  '5. Заголовок импортированного каталога указывает Unlicense/Public Domain. GIF-манифест не содержит отдельного поля лицензии. Условия каждого источника надо подтвердить отдельно; новые персонажи и риг должны быть оригинальными.',
  '6. В текущих манифестах не найден явный выбор male/female-варианта анимации. Его нужно добавить явно и протестировать.',
  '',
  '## Ключи видео, назначенные упражнениям повторно',
  '',
  '| Ключ | Назначений | Упражнения плана |',
  '|---|---:|---|',
  reusedKeysMarkdown || '| — | 0 | Нет |',
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
].join('\\n');

if (process.argv.includes('--write')) {
  fs.mkdirSync(path.dirname(path.join(ROOT, PATHS.report)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, PATHS.report), report);
  console.log('Wrote ' + PATHS.report);
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
