import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const DATASET_DIR = process.argv[2] ?? '/tmp/exercise-db-import/free-exercise-db';
const OUT_ASSETS_DIR = path.resolve(ROOT, 'apps/mobile/assets/exercise-library');
const OUT_DATA_FILE = path.resolve(
  ROOT,
  'apps/mobile/src/features/workout/importedExerciseLibrary.generated.ts'
);
const OUT_IMAGES_FILE = path.resolve(
  ROOT,
  'apps/mobile/src/features/workout/importedExerciseImages.generated.ts'
);

const HOME_EQUIPMENT = new Set(['body only', 'bands']);

const MUSCLE_TO_CATEGORY = {
  chest: 'chest',
  lats: 'back',
  'middle back': 'back',
  'lower back': 'back',
  traps: 'back',
  quadriceps: 'legs',
  hamstrings: 'legs',
  calves: 'legs',
  adductors: 'legs',
  abductors: 'legs',
  abdominals: 'abs',
  shoulders: 'arms',
  triceps: 'arms',
  biceps: 'arms',
  forearms: 'arms',
  glutes: 'glutes',
  neck: 'abs'
};

const NAME_TRANSLATIONS = {
  'Push-Up': 'Отжимания',
  'Push Up': 'Отжимания',
  Squat: 'Приседания',
  Plank: 'Планка',
  Lunge: 'Выпады',
  'Pull-Up': 'Подтягивания',
  'Pull Up': 'Подтягивания',
  'Sit-Up': 'Скручивания',
  'Sit Up': 'Скручивания',
  Crunch: 'Скручивания',
  Burpee: 'Бёрпи',
  'Mountain Climber': 'Скалолаз',
  'Jumping Jack': 'Прыжки Jumping Jack',
  'Chin-Up': 'Подтягивания обратным хватом',
  Dip: 'Отжимания на брусьях',
  'Glute Bridge': 'Ягодичный мостик',
  'Hip Thrust': 'Ягодичный мостик с опорой',
  'Dead Bug': 'Мёртвый жук',
  'Side Plank': 'Боковая планка',
  'Leg Raise': 'Подъём ног',
  'Calf Raise': 'Подъём на носки',
  'Superman': 'Супермен',
  'Bird Dog': 'Bird Dog',
  'Wall Sit': 'Стульчик у стены',
  'Jump Squat': 'Прыжки из приседа',
  'Reverse Crunch': 'Обратные скручивания',
  'Russian Twist': 'Русский твист',
  'Bicycle Crunch': 'Велосипед',
  'Hanging Leg Raise': 'Подъём ног в висе',
  'Close-Grip Push-Up': 'Отжимания узким хватом',
  'Diamond Push-Up': 'Алмазные отжимания',
  'Decline Push-Up': 'Отжимания с возвышения ног',
  'Incline Push-Up': 'Отжимания с возвышения рук',
  'Bodyweight Squat': 'Приседания',
  'Air Squat': 'Приседания',
  'Walking Lunge': 'Выпады в движении',
  'Reverse Lunge': 'Обратные выпады',
  'Bulgarian Split Squat': 'Болгарские выпады',
  'Inverted Row': 'Австралийские подтягивания',
  'Australian Pull-Up': 'Австралийские подтягивания',
  'Band Pull-Apart': 'Разведение резинки',
  'Face Pull': 'Тяга к лицу с резиной',
  'Triceps Extension': 'Разгибание на трицепс',
  'Lateral Raise': 'Разведение рук в стороны',
  'Front Raise': 'Подъём рук вперёд',
  'Shoulder Press': 'Жим над головой',
  'Pike Push-Up': 'Отжимания в стойке (pike)',
  'Handstand Push-Up': 'Отжимания в стойке на руках',
  'Hip Abduction': 'Отведение бедра',
  'Hip Adduction': 'Приведение бедра',
  'Donkey Kick': 'Отведение ноги назад',
  'Fire Hydrant': 'Пожарный гидрант',
  'Clamshell': 'Ракушка',
  'Good Morning': 'Good Morning',
  'Hyperextension': 'Гиперэкстензия',
  'Back Extension': 'Разгибание спины',
  'Neck Flexion': 'Сгибание шеи',
  'Neck Extension': 'Разгибание шеи'
};

function translateName(nameEn) {
  if (NAME_TRANSLATIONS[nameEn]) return NAME_TRANSLATIONS[nameEn];
  return null;
}

function slugify(id) {
  return id.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function categoryFor(primaryMuscles) {
  for (const m of primaryMuscles) {
    if (MUSCLE_TO_CATEGORY[m]) return MUSCLE_TO_CATEGORY[m];
  }
  return 'abs';
}

const exercises = JSON.parse(
  fs.readFileSync(path.join(DATASET_DIR, 'dist/exercises.json'), 'utf-8')
);

const filtered = exercises.filter((ex) => HOME_EQUIPMENT.has(ex.equipment));

fs.mkdirSync(OUT_ASSETS_DIR, { recursive: true });

const entries = [];
const imageRequireLines = [];
let untranslatedCount = 0;
let unmappedCategoryCount = 0;

for (const ex of filtered) {
  const slug = slugify(ex.id);
  const category = categoryFor(ex.primaryMuscles ?? []);
  if (!(ex.primaryMuscles ?? []).some((m) => MUSCLE_TO_CATEGORY[m])) {
    unmappedCategoryCount++;
  }

  const nameRu = translateName(ex.name);
  if (!nameRu) untranslatedCount++;

  const localImageKeys = [];
  (ex.images ?? []).forEach((imgRelPath, idx) => {
    const srcPath = path.join(DATASET_DIR, 'exercises', imgRelPath);
    if (!fs.existsSync(srcPath)) return;
    const destDir = path.join(OUT_ASSETS_DIR, slug);
    fs.mkdirSync(destDir, { recursive: true });
    const destPath = path.join(destDir, `${idx}.jpg`);
    fs.copyFileSync(srcPath, destPath);

    const key = `${slug}-${idx}`;
    localImageKeys.push(key);
    imageRequireLines.push(
      `  '${key}': require('../../../assets/exercise-library/${slug}/${idx}.jpg'),`
    );
  });

  entries.push({
    id: `lib-${slug}`,
    nameEn: ex.name,
    nameRu: nameRu,
    category,
    equipment: ex.equipment === 'bands' ? 'bands' : 'bodyweight',
    level: ex.level ?? null,
    primaryMuscles: ex.primaryMuscles ?? [],
    instructionsEn: ex.instructions ?? [],
    imageKeys: localImageKeys,
    sourceLicense: 'Unlicense',
    sourceUrl: `https://github.com/yuhonas/free-exercise-db/blob/main/exercises/${ex.id}.json`
  });
}

const dataFileContent = `/**
 * AUTO-GENERATED by scripts/import-exercise-db.mjs — do not edit by hand.
 * Source: yuhonas/free-exercise-db (Unlicense / Public Domain).
 * Re-run the script to regenerate after a dataset update.
 *
 * instructionsEn is intentionally NOT translated — see import decision log.
 * nameRu is null where no manual translation exists yet; UI must fall back
 * to nameEn in that case, not hide the exercise.
 */

export interface ImportedExercise {
  id: string;
  nameEn: string;
  nameRu: string | null;
  category: 'chest' | 'back' | 'legs' | 'abs' | 'arms' | 'glutes';
  equipment: 'bodyweight' | 'bands';
  level: string | null;
  primaryMuscles: string[];
  instructionsEn: string[];
  imageKeys: string[];
  sourceLicense: string;
  sourceUrl: string;
}

export const IMPORTED_EXERCISE_LIBRARY: ImportedExercise[] = ${JSON.stringify(entries, null, 2)};
`;

const imagesFileContent = `/**
 * AUTO-GENERATED by scripts/import-exercise-db.mjs — do not edit by hand.
 * Metro needs a static require() per file — this map is the reason this
 * file is generated rather than hand-written (131 entries × up to 2 images).
 */

export const IMPORTED_EXERCISE_IMAGES: Record<string, number> = {
${imageRequireLines.join('\n')}
};
`;

fs.writeFileSync(OUT_DATA_FILE, dataFileContent);
fs.writeFileSync(OUT_IMAGES_FILE, imagesFileContent);

console.log('Импортировано упражнений:', entries.length);
console.log('Без перевода названия (nameRu = null):', untranslatedCount);
console.log('Категория не распозналась по primaryMuscles (ушло в дефолт "abs"):', unmappedCategoryCount);
console.log('Картинок скопировано:', imageRequireLines.length);
console.log('Записано:', OUT_DATA_FILE);
console.log('Записано:', OUT_IMAGES_FILE);
