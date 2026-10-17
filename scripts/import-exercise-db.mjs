import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  requiresUnsupportedEquipment,
  translateName,
  slugify,
  categoryFor
} from './lib/exerciseImportRules.mjs';

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

// Ручной слой переводов инструкций: scripts/lib/instructions-ru.json.
// Ключ — slug упражнения (id без префикса «lib-»), значение — массив шагов на русском.
const INSTRUCTIONS_RU_PATH = path.resolve(__dirname, 'lib/instructions-ru.json');
const INSTRUCTIONS_RU: Record<string, string[]> = fs.existsSync(INSTRUCTIONS_RU_PATH)
  ? JSON.parse(fs.readFileSync(INSTRUCTIONS_RU_PATH, 'utf-8'))
  : {};

const HOME_EQUIPMENT = new Set(['body only', 'bands']);

// Курируемый allowlist тренажерных упражнений (Фаза 4): импортируются по id
// датасета, без общего фильтра по оборудованию. Порядок в файле результата:
// сначала домашние (body only / bands), затем тренажерные — Bridge (числовые
// id 100_000+index) рассчитан на этот порядок, не менять.
const GYM_IMPORT_IDS = new Set([
  'Ab_Crunch_Machine',
  'Alternate_Hammer_Curl',
  'Arnold_Dumbbell_Press',
  'Barbell_Bench_Press_-_Medium_Grip',
  'Barbell_Curl',
  'Barbell_Deadlift',
  'Barbell_Full_Squat',
  'Barbell_Glute_Bridge',
  'Barbell_Hip_Thrust',
  'Barbell_Incline_Bench_Press_-_Medium_Grip',
  'Barbell_Lunge',
  'Barbell_Shrug',
  'Barbell_Squat',
  'Bent_Over_Barbell_Row',
  'Butterfly',
  'Cable_Crossover',
  'Cable_Crunch',
  'Cable_Rope_Overhead_Triceps_Extension',
  'Close-Grip_Barbell_Bench_Press',
  'Close-Grip_Front_Lat_Pulldown',
  'Concentration_Curls',
  'Decline_Barbell_Bench_Press',
  'Dumbbell_Bench_Press',
  'Dumbbell_Bicep_Curl',
  'Dumbbell_Flyes',
  'Dumbbell_Lunges',
  'Dumbbell_Shrug',
  'EZ-Bar_Skullcrusher',
  'Face_Pull',
  'Front_Dumbbell_Raise',
  'Front_Squat_Clean_Grip',
  'Goblet_Squat',
  'Good_Morning',
  'Hack_Squat',
  'Incline_Dumbbell_Flyes',
  'Incline_Dumbbell_Press',
  'Kettlebell_Turkish_Get-Up_Lunge_style',
  'Leg_Extensions',
  'Leg_Press',
  'Lying_Leg_Curls',
  'Machine_Bench_Press',
  'One-Arm_Dumbbell_Row',
  'One-Arm_Kettlebell_Row',
  'One-Legged_Cable_Kickback',
  'Pallof_Press',
  'Preacher_Curl',
  'Pull_Through',
  'Reverse_Flyes',
  'Romanian_Deadlift',
  'Seated_Cable_Rows',
  'Seated_Calf_Raise',
  'Seated_Dumbbell_Press',
  'Seated_Leg_Curl',
  'Side_Lateral_Raise',
  'Split_Squat_with_Dumbbells',
  'Standing_Barbell_Calf_Raise',
  'Standing_Biceps_Cable_Curl',
  'Standing_Calf_Raises',
  'Standing_Dumbbell_Triceps_Extension',
  'Standing_Military_Press',
  'Stiff-Legged_Dumbbell_Deadlift',
  'Straight-Arm_Pulldown',
  'T-Bar_Row_with_Handle',
  'Triceps_Pushdown',
  'Upright_Barbell_Row',
  'Vertical_Swing',
  'Wide-Grip_Lat_Pulldown'
]);

// Нормализация оборудования датасета → union интерфейса ImportedExercise.
const EQUIPMENT_IMPORT = {
  'body only': 'bodyweight',
  bands: 'bands',
  dumbbell: 'dumbbells',
  barbell: 'barbell',
  cable: 'cable',
  machine: 'machine',
  kettlebells: 'kettlebell',
  'e-z curl bar': 'ez-bar'
};
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
  'Wrist Circles': 'Круги кистями',

  'Bottoms Up': 'Подъём таза «bottoms up»',
  Cocoons: 'Коконы (скручивания)',
  'Cross Over - With Bands': 'Кроссовер с резинкой',
  'Flat Bench Leg Pull-In': 'Подтягивание коленей лёжа',
  'Isometric Neck Exercise - Front And Back': 'Изометрия шеи вперёд-назад',
  'Isometric Neck Exercise - Sides': 'Изометрия шеи в стороны',
  'Isometric Wipers': 'Изометрические «дворники»',
  'Lying Glute': 'Ягодичные лёжа',
  'Lying Prone Quadriceps': 'Растяжка квадрицепса лёжа на животе',
  'Oblique Crunches - On The Floor': 'Скручивания на косые на полу',
  'Push-Ups - Close Triceps Position': 'Отжимания узким хватом (трицепс)',
  'Pushups (Close and Wide Hand Positions)': 'Отжимания узким и широким хватом',
  'Rocket Jump': 'Прыжок «ракета»',
  'Seated Front Deltoid': 'Передняя дельта сидя',
  'Seated Glute': 'Ягодичные сидя',
  'Side Jackknife': 'Боковая складка',
  'Speed Band Overhead Triceps': 'Разгибание на трицепс с резинкой стоя',
  'Spider Crawl': 'Паучий краул',
  'Standing Hip Circles': 'Круги бедром стоя',
  'Standing Towel Triceps Extension': 'Разгибание на трицепс полотенцем стоя',
  'Stomach Vacuum': 'Вакуум живота',

  // Тренажерные упражнения (Фаза 4) — курируемый набор с полным переводом.
  "Ab Crunch Machine": "Скручивания на пресс в тренажёре",
  "Alternate Hammer Curl": "Молотковые сгибания поочерёдно",
  "Arnold Dumbbell Press": "Жим Арнольда",
  "Barbell Bench Press - Medium Grip": "Жим штанги лёжа (средний хват)",
  "Barbell Curl": "Сгибания рук со штангой",
  "Barbell Deadlift": "Становая тяга со штангой",
  "Barbell Full Squat": "Приседания со штангой в полную глубину",
  "Barbell Glute Bridge": "Ягодичный мостик со штангой",
  "Barbell Hip Thrust": "Подъём таза со штангой с опорой (хип траст)",
  "Barbell Incline Bench Press - Medium Grip": "Жим штанги на наклонной скамье",
  "Barbell Lunge": "Выпады со штангой",
  "Barbell Shrug": "Шраги со штангой",
  "Barbell Squat": "Приседания со штангой",
  "Bent Over Barbell Row": "Тяга штанги в наклоне",
  "Butterfly": "Сведение в тренажёре «бабочка»",
  "Cable Crossover": "Кроссовер на блоках",
  "Cable Crunch": "Скручивания на блоке стоя",
  "Cable Rope Overhead Triceps Extension": "Разгибания на трицепс из-за головы с канатом",
  "Close-Grip Barbell Bench Press": "Жим штанги узким хватом",
  "Close-Grip Front Lat Pulldown": "Тяга верхнего блока узким хватом",
  "Concentration Curls": "Концентрированные сгибания",
  "Decline Barbell Bench Press": "Жим штанги на скамье с отрицательным наклоном",
  "Dumbbell Bench Press": "Жим гантелей лёжа",
  "Dumbbell Bicep Curl": "Сгибания рук с гантелями",
  "Dumbbell Flyes": "Разведения гантелей лёжа",
  "Dumbbell Lunges": "Выпады с гантелями",
  "Dumbbell Shrug": "Шраги с гантелями",
  "EZ-Bar Skullcrusher": "Французский жим с EZ-грифом",
  "Face Pull": "Тяга к лицу на блоке с канатом",
  "Front Dumbbell Raise": "Подъём гантели перед собой",
  "Front Squat (Clean Grip)": "Фронтальные приседания (хват «корзинка»)",
  "Goblet Squat": "Гоблет-приседания с гирей у груди",
  "Good Morning": "Наклоны со штангой (гуд морнинг)",
  "Hack Squat": "Гакк-приседания",
  "Incline Dumbbell Flyes": "Разведения гантелей на наклонной скамье",
  "Incline Dumbbell Press": "Жим гантелей на наклонной скамье",
  "Kettlebell Turkish Get-Up (Lunge style)": "Турецкий подъём с гирей",
  "Leg Extensions": "Разгибания ног сидя в тренажёре",
  "Leg Press": "Жим ногами в тренажёре",
  "Lying Leg Curls": "Сгибания ног лёжа в тренажёре",
  "Machine Bench Press": "Жим в тренажёре сидя",
  "One-Arm Dumbbell Row": "Тяга гантели одной рукой",
  "One-Arm Kettlebell Row": "Тяга гири одной рукой",
  "One-Legged Cable Kickback": "Отведение ноги назад на блоке",
  "Pallof Press": "Паллоф-пресс",
  "Preacher Curl": "Сгибания на скамье Скотта",
  "Pull Through": "Протяжка на блоке между ног",
  "Reverse Flyes": "Разведения гантелей на заднюю дельту",
  "Romanian Deadlift": "Румынская тяга",
  "Seated Cable Rows": "Тяга горизонтального блока",
  "Seated Calf Raise": "Подъёмы на носки сидя",
  "Seated Dumbbell Press": "Жим гантелей сидя",
  "Seated Leg Curl": "Сгибания ног сидя в тренажёре",
  "Side Lateral Raise": "Махи гантелями в стороны",
  "Split Squat with Dumbbells": "Приседания в ножницы с гантелями",
  "Standing Barbell Calf Raise": "Подъёмы на носки со штангой",
  "Standing Biceps Cable Curl": "Сгибания рук на нижнем блоке",
  "Standing Calf Raises": "Подъёмы на носки стоя",
  "Standing Dumbbell Triceps Extension": "Разгибание гантели из-за головы стоя",
  "Standing Military Press": "Армейский жим стоя",
  "Stiff-Legged Dumbbell Deadlift": "Мёртвая тяга с гантелями на прямых ногах",
  "Straight-Arm Pulldown": "Пуловер на блоке прямыми руками",
  "T-Bar Row with Handle": "Тяга Т-грифа с рукоятью",
  "Triceps Pushdown": "Разгибания на трицепс на блоке",
  "Upright Barbell Row": "Тяга штанги к подбородку",
  "Vertical Swing": "Махи гирей двумя руками",
  "Wide-Grip Lat Pulldown": "Тяга верхнего блока широким хватом"
};

const exercises = JSON.parse(
  fs.readFileSync(path.join(DATASET_DIR, 'dist/exercises.json'), 'utf-8')
);

const homeExercises = exercises.filter(
  (ex) => HOME_EQUIPMENT.has(ex.equipment) && !requiresUnsupportedEquipment(ex)
);
const gymExercises = exercises.filter((ex) => GYM_IMPORT_IDS.has(ex.id));
const filtered = [...homeExercises, ...gymExercises];

fs.mkdirSync(OUT_ASSETS_DIR, { recursive: true });

const entries = [];
const imageRequireLines = [];
const expectedImagePaths = new Set();
let untranslatedCount = 0;
let unmappedCategoryCount = 0;

for (const ex of filtered) {
  const slug = slugify(ex.id);
  const category = categoryFor(ex.primaryMuscles ?? [], MUSCLE_TO_CATEGORY);
  if (!(ex.primaryMuscles ?? []).some((m) => MUSCLE_TO_CATEGORY[m])) {
    unmappedCategoryCount++;
  }

  const nameRu = translateName(ex.name, NAME_TRANSLATIONS);
  if (!nameRu) untranslatedCount++;

  const isGymPick = GYM_IMPORT_IDS.has(ex.id);
  const localImageKeys = [];
  if (!isGymPick) {
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
  }

  entries.push({
    id: `lib-${slug}`,
    nameEn: ex.name,
    nameRu: nameRu,
    category,
    equipment: EQUIPMENT_IMPORT[ex.equipment] ?? 'bodyweight',
    level: ex.level ?? null,
    primaryMuscles: ex.primaryMuscles ?? [],
    instructionsEn: ex.instructions ?? [],
    instructionsRu: INSTRUCTIONS_RU[slug] ?? [],
    imageKeys: localImageKeys,
    sourceLicense: 'Unlicense',
    sourceUrl: `https://github.com/yuhonas/free-exercise-db/blob/main/exercises/${ex.id}.json`
  });
}

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
 * instructionsEn is the original dataset text; instructionsRu is a manual
 * translation layer — keep scripts/lib/instructions-ru.json in sync and
 * re-run the script after changes. UI falls back to instructionsEn when empty.
 * nameRu is null where no manual translation exists yet; UI must fall back
 * to nameEn in that case, not hide the exercise.
 *
 * Gym entries (dumbbells/barbell/cable/machine/kettlebell/ez-bar) are a
 * curated allowlist with full Russian names and instructions. Their
 * imageKeys are intentionally empty: media assets await a budget decision,
 * so the UI shows the phase-1 placeholder instead of dataset photos.
 */

export interface ImportedExercise {
  id: string;
  nameEn: string;
  nameRu: string | null;
  category: 'chest' | 'back' | 'legs' | 'abs' | 'arms' | 'glutes';
  equipment:
    | 'bodyweight'
    | 'bands'
    | 'dumbbells'
    | 'barbell'
    | 'cable'
    | 'machine'
    | 'kettlebell'
    | 'ez-bar';
  level: string | null;
  primaryMuscles: string[];
  instructionsEn: string[];
  instructionsRu: string[];
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
const withRuInstructions = entries.filter((e) => e.instructionsRu.length > 0).length;
console.log('Инструкции на русском:', withRuInstructions + '/' + entries.length);
console.log('Без перевода названия (nameRu = null):', untranslatedCount);
console.log(
  'Категория не распозналась по primaryMuscles (ушло в дефолт "abs"):',
  unmappedCategoryCount
);
console.log('Картинок скопировано:', imageRequireLines.length);
console.log('Записано:', OUT_DATA_FILE);
console.log('Записано:', OUT_IMAGES_FILE);
