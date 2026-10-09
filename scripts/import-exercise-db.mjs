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
const UNSUPPORTED_EQUIPMENT =
  /\b(?:dumbbells?|barbells?|benches|bench|cables?|machines?|kettlebells?|exercise balls?|stability balls?|medicine balls?|swiss balls?|pull[ -]?up bars?|chin[ -]?up bars?|racks?|smith machines?|weight plates?|step platforms?|chairs?|dip stations?|parallel bars?)\b/i;

function requiresUnsupportedEquipment(ex) {
  const instructions = (ex.instructions ?? []).join(' ');
  if (!UNSUPPORTED_EQUIPMENT.test(instructions)) return false;

  // Keep instructions that explicitly provide a no-equipment alternative;
  // e.g. floor/mat instead of a bench, or standing on the band instead of an anchor.
  const hasNoEquipmentAlternative =
    /\b(?:ground|floor|mat)\b[^.!?]{0,100}\bor\b[^.!?]{0,100}\b(?:bench|chair|equipment)\b/i.test(
      instructions
    ) ||
    /\b(?:bench|chair|equipment)\b[^.!?]{0,100}\bor\b[^.!?]{0,100}\b(?:ground|floor|mat)\b/i.test(
      instructions
    ) ||
    /\bmay hold onto\b[^.!?]{0,80}\b(?:chair|support)\b/i.test(instructions) ||
    /\balternatively\b[^.!?]{0,120}\bstanding on (?:the )?band\b/i.test(instructions);

  return !hasNoEquipmentAlternative;
}

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
  'Sit-Up': 'Подъём корпуса (ситап)',
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
  Superman: 'Супермен',
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
  'Bodyweight Squat': 'Приседания с собственным весом',
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
  Clamshell: 'Ракушка',
  'Good Morning': 'Good Morning',
  Hyperextension: 'Гиперэкстензия',
  'Back Extension': 'Разгибание спины',
  'Neck Flexion': 'Сгибание шеи',
  'Neck Extension': 'Разгибание шеи',

  // Manual batch from review (exact nameEn matches only)
  '3/4 Sit-Up': 'Скручивания на ¾',
  '90/90 Hamstring': 'Разгибание ноги 90/90',
  'Air Bike': 'Велосипед (пресс)',
  'All Fours Quad Stretch': 'Растяжка квадрицепса в упоре на четвереньках',
  'Alternate Heel Touchers': 'Касания пяток поочерёдно',
  'Band Good Morning': 'Наклоны с резинкой (гуд морнинг)',
  'Band Good Morning (Pull Through)': 'Наклоны с резинкой (протяжка)',
  'Band Hip Adductions': 'Приведение бедра с резинкой',
  'Band Pull Apart': 'Разведение резинки перед собой',
  'Bent-Knee Hip Raise': 'Подъём таза с согнутыми коленями',
  'Body-Up': 'Подъём корпуса (боди-ап)',
  'Butt Lift (Bridge)': 'Ягодичный мостик',
  'Butt-Ups': 'Подъёмы таза',
  'Calf Raises - With Bands': 'Подъёмы на носки с резинкой',
  'Clock Push-Up': 'Отжимания «часы»',
  'Cross-Body Crunch': 'Скручивания крест-накрест',
  'Crunch - Hands Overhead': 'Скручивания с руками над головой',
  Crunches: 'Скручивания',
  'Dips - Triceps Version': 'Отжимания на трицепс (брусья/опора)',
  'Double Leg Butt Kick': 'Захлёст голени двумя ногами',
  'Elbow to Knee': 'Локоть к колену',
  'External Rotation with Band': 'Наружная ротация плеча с резинкой',
  'Fast Skipping': 'Бег на месте высокий темп',
  'Freehand Jump Squat': 'Приседания с выпрыгиванием',
  'Frog Sit-Ups': 'Скручивания «лягушка»',
  'Glute Kickback': 'Махи ногой назад (ягодичные)',
  Groiners: 'Альпинист с поворотом (гроинеры)',
  'Handstand Push-Ups': 'Отжимания в стойке на руках',
  'Hip Circles (prone)': 'Круги бедром лёжа на животе',
  'Hip Extension with Bands': 'Разгибание бедра с резинкой',
  'Hip Flexion with Band': 'Сгибание бедра с резинкой',
  Inchworm: 'Инчворм (шагающая планка)',
  'Internal Rotation with Band': 'Внутренняя ротация плеча с резинкой',
  'Isometric Chest Squeezes': 'Изометрическое сведение груди',
  'Jackknife Sit-Up': 'Складка (джекнайф)',
  'Janda Sit-Up': 'Скручивания Янда',
  'Knee Circles': 'Круги коленями',
  'Knee Tuck Jump': 'Прыжки с подтягиванием колен',
  'Lateral Bound': 'Прыжки в сторону',
  'Lateral Raise - With Bands': 'Разведение рук в стороны с резинкой',
  'Leg Pull-In': 'Подтягивание коленей лёжа',
  'Lower Back Curl': 'Разгибание поясницы',
  'Lying Crossover': 'Скручивания крест-накрест лёжа',
  'Monster Walk': 'Ходьба с резинкой (монстр-walk)',
  'Oblique Crunches': 'Скручивания на косые мышцы',
  'Overhead Triceps': 'Разгибание рук на трицепс над головой',
  'Plyo Push-up': 'Плиометрические отжимания',
  'Push Up to Side Plank': 'Отжимание с выходом в боковую планку',
  'Push-Up Wide': 'Отжимания широким хватом',
  Pushups: 'Отжимания',
  'Rear Leg Raises': 'Махи ногой назад стоя',
  'Scissor Kick': 'Ножницы (мах ногами)',
  'Scissors Jump': 'Прыжки ножницы',
  'Seated Biceps': 'Сгибание рук на бицепс сидя',
  'Shoulder Press - With Bands': 'Жим плеч с резинкой',
  'Side Bridge': 'Боковая планка',
  'Side Leg Raises': 'Махи ногой в сторону лёжа',
  'Single Leg Butt Kick': 'Захлёст голени одной ногой',
  'Single Leg Glute Bridge': 'Ягодичный мостик на одной ноге',
  'Single-Arm Push-Up': 'Отжимания на одной руке',
  'Split Jump': 'Прыжки в выпаде со сменой ног',
  'Squats - With Bands': 'Приседания с резинкой',
  'Standing Long Jump': 'Прыжок в длину с места',
  'Star Jump': 'Прыжок звездой',
  'Toe Touchers': 'Складка до носков лёжа',
  'Tuck Crunch': 'Скручивания с подтягиванием колен',
  'Upright Row - With Bands': 'Тяга к подбородку с резинкой',
  'Wrist Circles': 'Круги кистями'
};

function translateName(nameEn) {
  if (NAME_TRANSLATIONS[nameEn]) return NAME_TRANSLATIONS[nameEn];
  return null;
}

function slugify(id) {
  return id
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
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

const filtered = exercises.filter(
  (ex) => HOME_EQUIPMENT.has(ex.equipment) && !requiresUnsupportedEquipment(ex)
);

fs.mkdirSync(OUT_ASSETS_DIR, { recursive: true });

const entries = [];
const imageRequireLines = [];
const expectedImagePaths = new Set();
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
    expectedImagePaths.add(destPath);
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

// Remove only stale JPGs in this generated asset tree so filtered exercises do
// not leave unreferenced images behind after a dataset refresh.
for (const dirEntry of fs.readdirSync(OUT_ASSETS_DIR, { withFileTypes: true })) {
  if (!dirEntry.isDirectory()) continue;
  const exerciseDir = path.join(OUT_ASSETS_DIR, dirEntry.name);
  for (const fileEntry of fs.readdirSync(exerciseDir, { withFileTypes: true })) {
    const imagePath = path.join(exerciseDir, fileEntry.name);
    if (
      fileEntry.isFile() &&
      fileEntry.name.toLowerCase().endsWith('.jpg') &&
      !expectedImagePaths.has(imagePath)
    ) {
      fs.unlinkSync(imagePath);
    }
  }
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
 * file is generated rather than hand-written (${entries.length} entries × up to 2 images).
 */

export const IMPORTED_EXERCISE_IMAGES: Record<string, number> = {
${imageRequireLines.join('\n')}
};
`;

fs.writeFileSync(OUT_DATA_FILE, dataFileContent);
fs.writeFileSync(OUT_IMAGES_FILE, imagesFileContent);

console.log('Импортировано упражнений:', entries.length);
console.log('Без перевода названия (nameRu = null):', untranslatedCount);
console.log(
  'Категория не распозналась по primaryMuscles (ушло в дефолт "abs"):',
  unmappedCategoryCount
);
console.log('Картинок скопировано:', imageRequireLines.length);
console.log('Записано:', OUT_DATA_FILE);
console.log('Записано:', OUT_IMAGES_FILE);
