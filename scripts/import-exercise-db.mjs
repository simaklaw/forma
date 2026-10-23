import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  requiresUnsupportedEquipment,
  translateName,
  slugify,
  categoryFor,
  validateDataset
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

// Переводы названий tier-2 тренажерных упражнений (auto-curated import):
// каждое имя из датасета, которого нет в словарях выше, — точный перевод,
// без угадывания. Ключи соответствуют полю name датасета.
const GYM_EXTRA_NAME_TRANSLATIONS = {
  "Advanced Kettlebell Windmill": "Мельница с гирей (продвинутая)",
  "Alternate Incline Dumbbell Curl": "Попеременные сгибания с гантелями на наклонной скамье",
  "Alternating Cable Shoulder Press": "Попеременный жим плеч на блоке",
  "Alternating Deltoid Raise": "Поперемённые подъёмы на дельты",
  "Alternating Floor Press": "Попеременный жим с пола",
  "Alternating Hang Clean": "Попеременное взятие на грудь с виса",
  "Alternating Kettlebell Press": "Попеременный жим с гирями",
  "Alternating Kettlebell Row": "Попеременная тяга с гирями",
  "Alternating Renegade Row": "Попеременная тяга в планке (ренегейт)",
  "Anti-Gravity Press": "Жим «антигравитационный»",
  "Around The Worlds": "Круговые разведения вокруг корпуса",
  "Barbell Ab Rollout - On Knees": "Прокат штанги с колен",
  "Barbell Ab Rollout": "Прокат штанги (ab rollout)",
  "Barbell Curls Lying Against An Incline": "Сгибания рук со штангой лёжа на наклонной скамье",
  "Barbell Guillotine Bench Press": "Жим штанги к шее (гильотина)",
  "Barbell Hack Squat": "Гакк-приседания со штангой",
  "Barbell Incline Shoulder Raise": "Подъёмы штанги на наклонной скамье (передние дельты)",
  "Barbell Rear Delt Row": "Тяга штанги на заднюю дельту",
  "Barbell Rollout from Bench": "Прокат штанги от скамьи",
  "Barbell Seated Calf Raise": "Подъёмы на носки сидя со штангой",
  "Barbell Shoulder Press": "Жим штанги над головой",
  "Barbell Shrug Behind The Back": "Шраги со штангой за спиной",
  "Barbell Side Bend": "Наклоны в стороны со штангой",
  "Barbell Side Split Squat": "Боковые приседания в ножницы со штангой",
  "Barbell Squat To A Bench": "Приседания со штангой до скамьи",
  "Barbell Step Ups": "Зашагивания на платформу со штангой",
  "Barbell Walking Lunge": "Выпады в движении со штангой",
  "Bench Press - Powerlifting": "Жим штанги лёжа (пауэрлифтинг)",
  "Bench Press with Chains": "Жим штанги лёжа с цепями",
  "Bent Over Dumbbell Rear Delt Raise With Head On Bench": "Разведения гантелей на заднюю дельту с головой на скамье",
  "Bent Over Low-Pulley Side Lateral": "Отведения в стороны на нижнем блоке в наклоне",
  "Bent Over One-Arm Long Bar Row": "Тяга длинного грифа одной рукой в наклоне",
  "Bent Over Two-Arm Long Bar Row": "Тяга длинного грифа двумя руками в наклоне",
  "Bent Over Two-Dumbbell Row With Palms In": "Тяга двух гантелей в наклоне нейтральным хватом",
  "Bent Over Two-Dumbbell Row": "Тяга двух гантелей в наклоне",
  "Bent Press": "Бент-пресс (жим наклоном корпуса)",
  "Bent-Arm Barbell Pullover": "Пуловер со штангой на согнутых руках",
  "Bent-Arm Dumbbell Pullover": "Пуловер с гантелью на согнутых руках",
  "Bicycling, Stationary": "Велотренажёр",
  "Board Press": "Жим с доской на груди",
  "Bodyweight Flyes": "Разведения в стороны с собственным весом",
  "Bosu Ball Cable Crunch With Side Bends": "Скручивания на блоке с наклонами на BOSU",
  "Bottoms-Up Clean From The Hang Position": "Взятие на грудь дном вверх с виса",
  "Box Squat with Bands": "Приседания на ящик с резинами",
  "Box Squat with Chains": "Приседания на ящик с цепями",
  "Box Squat": "Приседания на ящик",
  "Bradford/Rocky Presses": "Жимы Брэдфорда",
  "Cable Chest Press": "Жим на грудь на блоке",
  "Cable Deadlifts": "Становая тяга на блоке",
  "Cable Hammer Curls - Rope Attachment": "Молотковые сгибания с канатом на блоке",
  "Cable Hip Adduction": "Приведение бедра на блоке",
  "Cable Incline Pushdown": "Разгибания на наклонной скамье на блоке",
  "Cable Incline Triceps Extension": "Разгибания на трицепс на наклонной скамье с блоком",
  "Cable Internal Rotation": "Внутренняя ротация плеча на блоке",
  "Cable Iron Cross": "Железный крест на блоках",
  "Cable Judo Flip": "«Дзюдо-переворот» на блоке",
  "Cable Lying Triceps Extension": "Разгибания на трицепс лёжа на блоке",
  "Cable One Arm Tricep Extension": "Разгибания на трицепс одной рукой на блоке",
  "Cable Preacher Curl": "Сгибания на блоке на скамье Скотта",
  "Cable Rear Delt Fly": "Разведения на заднюю дельту на блоке",
  "Cable Reverse Crunch": "Обратные скручивания на блоке",
  "Cable Rope Rear-Delt Rows": "Тяга каната к лицу на заднюю дельту",
  "Cable Russian Twists": "Русский твист на блоке",
  "Cable Seated Crunch": "Скручивания сидя на блоке",
  "Cable Seated Lateral Raise": "Отведения в стороны сидя на блоке",
  "Cable Shoulder Press": "Жим плеч на блоке",
  "Cable Shrugs": "Шраги на блоке",
  "Cable Wrist Curl": "Сгибания запястий на блоке",
  "Calf Press On The Leg Press Machine": "Жимы носками в тренажёре для жима ногами",
  "Calf Press": "Жимы носками",
  "Calf Raise On A Dumbbell": "Подъёмы на носок на гантели",
  "Calf-Machine Shoulder Shrug": "Шраги в тренажёре для икр",
  "Car Drivers": "«Водитель» (руление с весом)",
  "Chair Squat": "Приседания со стулом",
  "Clean and Jerk": "Взятие на грудь с толчком",
  "Clean and Press": "Взятие на грудь с жимом",
  "Clean Deadlift": "Становая тяга взятия на грудь",
  "Clean from Blocks": "Взятие на грудь с блоков",
  "Clean Pull": "Тяга для взятия на грудь",
  "Clean Shrug": "Шраги-подрыв для взятия на грудь",
  "Clean": "Взятие штанги на грудь",
  "Close-Grip Dumbbell Press": "Жим гантелей узким хватом",
  "Close-Grip EZ Bar Curl": "Сгибания с EZ-грифом узким хватом",
  "Close-Grip EZ-Bar Curl with Band": "Сгибания с EZ-грифом узким хватом с резинкой",
  "Close-Grip EZ-Bar Press": "Жим EZ-грифа узким хватом",
  "Close-Grip Standing Barbell Curl": "Сгибания со штангой узким хватом стоя",
  "Cross Body Hammer Curl": "Молотковые сгибания поперёк корпуса",
  "Cuban Press": "Кубинский жим",
  "Deadlift with Bands": "Становая тяга с резинами",
  "Deadlift with Chains": "Становая тяга с цепями",
  "Decline Close-Grip Bench To Skull Crusher": "Жим узким хватом на наклонной вниз + французский",
  "Decline Dumbbell Bench Press": "Жим гантелей на скамье с отрицательным наклоном",
  "Decline Dumbbell Flyes": "Разведения гантелей на скамье с отрицательным наклоном",
  "Decline Dumbbell Triceps Extension": "Разгибания с гантелями на наклонной вниз скамье",
  "Decline EZ Bar Triceps Extension": "Французский жим с EZ-грифом на наклонной вниз",
  "Decline Smith Press": "Жим в тренажёре Смита на наклонной вниз",
  "Deficit Deadlift": "Становая тяга с дефицитом (с возвышения)",
  "Dip Machine": "Тренажёр для отжиманий на брусьях",
  "Double Kettlebell Alternating Hang Clean": "Попеременное взятие двух гирь с виса",
  "Double Kettlebell Jerk": "Толчок двух гирь",
  "Double Kettlebell Push Press": "Пуш-пресс с двумя гирями",
  "Double Kettlebell Snatch": "Рывок двух гирь",
  "Double Kettlebell Windmill": "Мельница с двумя гирями",
  "Drag Curl": "Сгибания «драг кёрл» (с протяжкой вдоль корпуса)",
  "Dumbbell Alternate Bicep Curl": "Поочерёдные сгибания рук с гантелями",
  "Dumbbell Bench Press with Neutral Grip": "Жим гантелей лёжа нейтральным хватом",
  "Dumbbell Clean": "Взятие гантели на грудь",
  "Dumbbell Floor Press": "Жим гантелей с пола",
  "Dumbbell Incline Row": "Тяга гантелей на наклонной скамье",
  "Dumbbell Incline Shoulder Raise": "Подъёмы гантелей на наклонной скамье",
  "Dumbbell Lying One-Arm Rear Lateral Raise": "Отведения одной руки лёжа на боку",
  "Dumbbell Lying Pronation": "Пронация с гантелью лёжа",
  "Dumbbell Lying Rear Lateral Raise": "Разведения на заднюю дельту лёжа",
  "Dumbbell Lying Supination": "Супинация с гантелью лёжа",
  "Dumbbell One-Arm Shoulder Press": "Жим гантели одной рукой",
  "Dumbbell One-Arm Triceps Extension": "Разгибание гантели одной рукой из-за головы",
  "Dumbbell One-Arm Upright Row": "Тяга гантели к подбородку одной рукой",
  "Dumbbell Prone Incline Curl": "Сгибания с гантелями лёжа на наклонной скамье",
  "Dumbbell Raise": "Подъёмы гантелей перед собой",
  "Dumbbell Rear Lunge": "Обратные выпады с гантелями",
  "Dumbbell Scaption": "Подъёмы «скапция» (Y-подъёмы с гантелями)",
  "Dumbbell Seated Box Jump": "Прыжки на тумбу с гантелями (из сидячего)",
  "Dumbbell Seated One-Leg Calf Raise": "Подъёмы на носок сидя с гантелью на одной ноге",
  "Dumbbell Shoulder Press": "Жим гантелей над головой",
  "Dumbbell Side Bend": "Наклоны в стороны с гантелью",
  "Dumbbell Squat To A Bench": "Приседания с гантелями до скамьи",
  "Dumbbell Squat": "Приседания с гантелями",
  "Dumbbell Step Ups": "Зашагивания на платформу с гантелями",
  "Dumbbell Tricep Extension -Pronated Grip": "Разгибания на трицепс с гантелью пронированным хватом",
  "Elevated Back Lunge": "Обратные выпады с возвышения",
  "Elevated Cable Rows": "Тяга на блоке с возвышения",
  "Elliptical Trainer": "Эллиптический тренажёр",
  "Extended Range One-Arm Kettlebell Floor Press": "Жим гири одной рукой с пола с расширенной амплитудой",
  "External Rotation with Cable": "Наружная ротация плеча на блоке",
  "External Rotation": "Наружная ротация плеча",
  "EZ-Bar Curl": "Сгибания рук с EZ-грифом",
  "Finger Curls": "Сгибания пальцев",
  "Flat Bench Cable Flyes": "Разведения на блоке лёжа",
  "Flexor Incline Dumbbell Curls": "Сгибания сгибателей на наклонной скамье с гантелями",
  "Floor Press with Chains": "Жим с пола с цепями",
  "Floor Press": "Жим с пола",
  "Frankenstein Squat": "Приседания «Франкенштейн» (гриф на дельтах)",
  "Front Barbell Squat To A Bench": "Фронтальные приседания со штангой до скамьи",
  "Front Barbell Squat": "Фронтальные приседания со штангой",
  "Front Cable Raise": "Подъёмы на блоке перед собой",
  "Front Incline Dumbbell Raise": "Подъёмы гантелей перед собой на наклонной скамье",
  "Front Raise And Pullover": "Подъём перед собой с переходом в пуловер",
  "Front Squats With Two Kettlebells": "Фронтальные приседания с двумя гирями",
  "Front Two-Dumbbell Raise": "Подъёмы двух гантелей перед собой",
  "Full Range-Of-Motion Lat Pulldown": "Тяга верхнего блока с полной амплитудой",
  "Glute Ham Raise": "Глют-хэм (разгибание со сгибанием ног)",
  "Good Morning off Pins": "Гуд морнинг с пинов",
  "Hammer Curls": "Молотковые сгибания с гантелями",
  "Hammer Grip Incline DB Bench Press": "Жим гантелей на наклонной скамье (молотковый хват)",
  "Hang Clean - Below the Knees": "Взятие на грудь с виса ниже колен",
  "Hang Clean": "Взятие на грудь с виса",
  "Hang Snatch - Below Knees": "Рывок с виса ниже колен",
  "Hang Snatch": "Рывок с виса",
  "Hanging Bar Good Morning": "Гуд морнинг в висе на перекладине",
  "Heaving Snatch Balance": "Рывковый баланс с отправкой",
  "High Cable Curls": "Сгибания на верхнем блоке",
  "Incline Barbell Triceps Extension": "Французский жим штанги на наклонной скамье",
  "Incline Bench Pull": "Тяга штанги лёжа на наклонной скамье (к пояснице)",
  "Incline Cable Chest Press": "Жим на грудь на блоке с наклонной скамьи",
  "Incline Cable Flye": "Разведения на блоке на наклонной скамье",
  "Incline Dumbbell Bench With Palms Facing In": "Жим гантелей на наклонной скамье ладонями внутрь",
  "Incline Dumbbell Curl": "Сгибания с гантелями на наклонной скамье",
  "Incline Dumbbell Flyes - With A Twist": "Разведения гантелей на наклонной скамье с поворотом",
  "Incline Hammer Curls": "Молотковые сгибания на наклонной скамье",
  "Incline Inner Biceps Curl": "Сгибания на внутреннюю головку бицепса на наклонной скамье",
  "Iron Cross": "Железный крест (с гантелями)",
  "Jefferson Squats": "Приседания Джефферсона (гриф между ног)",
  "Jerk Balance": "Баланс толчка",
  "Jerk Dip Squat": "Подсед под толчок",
  "JM Press": "JM-жим",
  "Jogging, Treadmill": "Бег трусцой на дорожке",
  "Kettlebell Arnold Press": "Жим Арнольда с гирей",
  "Kettlebell Dead Clean": "Взятие гири на грудь с пола",
  "Kettlebell Figure 8": "Восьмёрка с гирей",
  "Kettlebell Halo with Overhead Extension": "Гало с гирей с разгибанием над головой",
  "Kettlebell Halo": "Гало с гирей (круг вокруг головы)",
  "Kettlebell Hang Clean": "Взятие гири на грудь с виса",
  "Kettlebell One-Legged Deadlift": "Становая тяга с гирей на одной ноге",
  "Kettlebell Overhead Triceps Extension": "Разгибания на трицепс с гирей из-за головы",
  "Kettlebell Pass Between The Legs": "Передача гири между ног",
  "Kettlebell Pirate Ships": "«Пиратский корабль» (качание с гирей)",
  "Kettlebell Pistol Squat": "Пистолетик с гирей",
  "Kettlebell Seated Press": "Жим гири сидя",
  "Kettlebell Seesaw Press": "Попеременный жим гирь («качели»)",
  "Kettlebell Sumo High Pull": "Сумо-тяга гири к подбородку",
  "Kettlebell Thruster": "Трастер с гирей",
  "Kettlebell Turkish Get-Up (Squat style)": "Турецкий подъём с гирей (через присед)",
  "Kettlebell Windmill": "Мельница с гирей",
  "Kneeling Cable Crunch With Alternating Oblique Twists": "Скручивания на блоке с колен с поворотами на косые",
  "Kneeling Cable Triceps Extension": "Разгибания на трицепс на блоке с колен",
  "Kneeling High Pulley Row": "Тяга верхнего блока с колен",
  "Kneeling Jump Squat": "Прыжок в присед с колен",
  "Kneeling Single-Arm High Pulley Row": "Тяга верхнего блока одной рукой с колен",
  "Kneeling Squat": "Приседания на коленях",
  "Landmine 180's": "Повороты с landmine-грифом на 180°",
  "Landmine Linear Jammer": "Толчок landmine-грифа по прямой",
  "Leg-Over Floor Press": "Жим с пола с перешагиванием ноги",
  "Leverage Chest Press": "Жим в рычажном тренажёре",
  "Leverage Deadlift": "Становая тяга в рычажном тренажёре",
  "Leverage Decline Chest Press": "Жим в рычажном тренажёре с отрицательным наклоном",
  "Leverage High Row": "Высокая тяга в рычажном тренажёре",
  "Leverage Incline Chest Press": "Жим на наклонной в рычажном тренажёре",
  "Leverage Iso Row": "Изолированная тяга в рычажном тренажёре",
  "Leverage Shoulder Press": "Жим плеч в рычажном тренажёре",
  "Leverage Shrug": "Шраги в рычажном тренажёре",
  "Low Cable Crossover": "Кроссовер на нижнем блоке",
  "Low Cable Triceps Extension": "Разгибания на трицепс на нижнем блоке",
  "Low Pulley Row To Neck": "Тяга нижнего блока к шее",
  "Lunge Pass Through": "Выпад с проводкой гири под ногой",
  "Lunge Sprint": "Спринт-выпады",
  "Lying Cable Curl": "Сгибания рук лёжа на блоке",
  "Lying Cambered Barbell Row": "Тяга изогнутого грифа лёжа",
  "Lying Close-Grip Bar Curl On High Pulley": "Сгибания со штангой узким хватом лёжа на верхнем блоке",
  "Lying Close-Grip Barbell Triceps Extension Behind The Head": "Французский жим узким хватом из-за головы лёжа",
  "Lying Close-Grip Barbell Triceps Press To Chin": "Жим узким хватом к подбородку лёжа",
  "Lying Dumbbell Tricep Extension": "Разгибания с гантелями лёжа",
  "Lying High Bench Barbell Curl": "Сгибания со штангой лёжа на высокой скамье",
  "Lying Machine Squat": "Приседания в тренажёре лёжа",
  "Lying One-Arm Lateral Raise": "Отведения в сторону одной рукой лёжа",
  "Lying Rear Delt Raise": "Подъёмы на заднюю дельту лёжа",
  "Lying Supine Dumbbell Curl": "Сгибания с гантелями лёжа на спине",
  "Lying T-Bar Row": "Тяга Т-грифа лёжа",
  "Lying Triceps Press": "Французский жим лёжа",
  "Machine Bicep Curl": "Сгибания на бицепс в тренажёре",
  "Machine Preacher Curls": "Сгибания в тренажёре на скамье Скотта",
  "Machine Shoulder (Military) Press": "Армейский жим в тренажёре",
  "Machine Triceps Extension": "Разгибания на трицепс в тренажёре",
  "Middle Back Shrug": "Шраги средним отделом спины",
  "Muscle Snatch": "Мышечный рывок (без подседа)",
  "Narrow Stance Hack Squats": "Гакк-приседания узкой стойкой",
  "Narrow Stance Leg Press": "Жим ногами узкой постановкой",
  "Narrow Stance Squats": "Приседания узкой стойкой",
  "Neck Press": "Жим к шее",
  "Olympic Squat": "Олимпийские приседания",
  "One Arm Dumbbell Bench Press": "Жим гантели одной рукой лёжа",
  "One Arm Dumbbell Preacher Curl": "Сгибания с гантелью на скамье Скотта одной рукой",
  "One Arm Floor Press": "Жим одной рукой с пола",
  "One Arm Lat Pulldown": "Тяга верхнего блока одной рукой",
  "One Arm Pronated Dumbbell Triceps Extension": "Разгибания гантели одной рукой пронированным хватом",
  "One Arm Supinated Dumbbell Triceps Extension": "Разгибания гантели одной рукой супинированным хватом",
  "One Leg Barbell Squat": "Приседания со штангой на одной ноге",
  "One-Arm Flat Bench Dumbbell Flye": "Разведения с гантелью одной рукой лёжа",
  "One-Arm High-Pulley Cable Side Bends": "Наклоны в стороны на верхнем блоке одной рукой",
  "One-Arm Incline Lateral Raise": "Отведения в стороны одной рукой на наклонной скамье",
  "One-Arm Kettlebell Clean and Jerk": "Взятие гири на грудь с толчком одной рукой",
  "One-Arm Kettlebell Clean": "Взятие гири на грудь одной рукой",
  "One-Arm Kettlebell Floor Press": "Жим гири одной рукой с пола",
  "One-Arm Kettlebell Jerk": "Толчок гири одной рукой",
  "One-Arm Kettlebell Military Press To The Side": "Жим гири одной рукой в сторону",
  "One-Arm Kettlebell Para Press": "Пара-жим гири одной рукой",
  "One-Arm Kettlebell Push Press": "Пуш-пресс с гирей одной рукой",
  "One-Arm Kettlebell Snatch": "Рывок гири одной рукой",
  "One-Arm Kettlebell Split Jerk": "Толчок гири в ножницы одной рукой",
  "One-Arm Kettlebell Split Snatch": "Рывок гири в ножницы одной рукой",
  "One-Arm Kettlebell Swings": "Махи гирей одной рукой",
  "One-Arm Long Bar Row": "Тяга длинного грифа одной рукой",
  "One-Arm Open Palm Kettlebell Clean": "Взятие гири на грудь открытой ладонью",
  "One-Arm Overhead Kettlebell Squats": "Приседания с гирей над головой одной рукой",
  "One-Arm Side Deadlift": "Боковая становая тяга одной рукой",
  "One-Arm Side Laterals": "Отведения в стороны одной рукой",
  "Open Palm Kettlebell Clean": "Взятие гирь на грудь открытыми ладонями",
  "Overhead Cable Curl": "Сгибания на блоке из-за головы",
  "Overhead Squat": "Приседания со штангой над головой",
  "Pallof Press With Rotation": "Паллоф-пресс с поворотом",
  "Palms-Down Dumbbell Wrist Curl Over A Bench": "Сгибания запястий с гантелей ладонями вниз через скамью",
  "Palms-Down Wrist Curl Over A Bench": "Сгибания запястий ладонями вниз через скамью",
  "Palms-Up Barbell Wrist Curl Over A Bench": "Сгибания запястий со штангой ладонями вверх через скамью",
  "Palms-Up Dumbbell Wrist Curl Over A Bench": "Сгибания запястий с гантелей ладонями вверх через скамью",
  "Pin Presses": "Жимы с пинов",
  "Plie Dumbbell Squat": "Плие-приседания с гантелью",
  "Plyo Kettlebell Pushups": "Плиометрические отжимания на гирях",
  "Power Clean from Blocks": "Взятие на грудь с блоков (power)",
  "Power Clean": "Взятие на грудь без подседа (power clean)",
  "Power Jerk": "Толчок без выпада (power jerk)",
  "Power Partials": "Частичные подъёмы (power partials)",
  "Power Snatch from Blocks": "Рывок с блоков (power)",
  "Power Snatch": "Рывок без подседа (power snatch)",
  "Preacher Hammer Dumbbell Curl": "Молотковые сгибания с гантелью на скамье Скотта",
  "Press Sit-Up": "Скручивания с жимом",
  "Push Press - Behind the Neck": "Пуш-пресс из-за головы",
  "Push Press": "Жим с толчком ног (пуш-пресс)",
  "Rack Delivery": "Съём штанги со стойки (rack delivery)",
  "Rack Pull with Bands": "Тяга с плинтов с резинами",
  "Rack Pulls": "Тяга с плинтов",
  "Recumbent Bike": "Лежачий велотренажёр",
  "Reverse Band Bench Press": "Жим лёжа с демпфирующими резинами",
  "Reverse Band Box Squat": "Приседания на ящик с демпфирующими резинами",
  "Reverse Band Deadlift": "Становая тяга с демпфирующими резинами",
  "Reverse Band Power Squat": "Силовые приседания с демпфирующими резинами",
  "Reverse Band Sumo Deadlift": "Сумо-становая с демпфирующими резинами",
  "Reverse Barbell Curl": "Обратные сгибания со штангой",
  "Reverse Barbell Preacher Curls": "Обратные сгибания со штангой на скамье Скотта",
  "Reverse Cable Curl": "Обратные сгибания на блоке",
  "Reverse Flyes With External Rotation": "Разведения на заднюю дельту с наружной ротацией",
  "Reverse Grip Bent-Over Rows": "Тяга в наклоне обратным хватом",
  "Reverse Grip Triceps Pushdown": "Разгибания на блоке обратным хватом",
  "Reverse Hyperextension": "Обратная гиперэкстензия",
  "Reverse Machine Flyes": "Обратные разведения в тренажёре",
  "Reverse Triceps Bench Press": "Жим лёжа обратным хватом на трицепс",
  "Rocking Standing Calf Raise": "Покачивающиеся подъёмы на носки стоя",
  "Romanian Deadlift from Deficit": "Румынская тяга с возвышения",
  "Rope Crunch": "Скручивания с канатом на блоке",
  "Rope Straight-Arm Pulldown": "Пуловер на блоке прямыми руками с канатом",
  "Rowing, Stationary": "Гребной тренажёр",
  "Running, Treadmill": "Бег на беговой дорожке",
  "Seated Barbell Military Press": "Армейский жим штанги сидя",
  "Seated Barbell Twist": "Повороты корпуса со штангой сидя",
  "Seated Bent-Over One-Arm Dumbbell Triceps Extension": "Разгибания гантели одной рукой в наклоне сидя",
  "Seated Bent-Over Rear Delt Raise": "Подъёмы на заднюю дельту в наклоне сидя",
  "Seated Bent-Over Two-Arm Dumbbell Triceps Extension": "Разгибания гантелей двумя руками в наклоне сидя",
  "Seated Cable Shoulder Press": "Жим плеч на блоке сидя",
  "Seated Close-Grip Concentration Barbell Curl": "Концентрированные сгибания со штангой узким хватом сидя",
  "Seated Dumbbell Curl": "Сгибания с гантелями сидя",
  "Seated Dumbbell Inner Biceps Curl": "Сгибания на внутреннюю головку бицепса сидя",
  "Seated Dumbbell Palms-Down Wrist Curl": "Сгибания запястий с гантелями ладонями вниз сидя",
  "Seated Dumbbell Palms-Up Wrist Curl": "Сгибания запястий с гантелями ладонями вверх сидя",
  "Seated Good Mornings": "Гуд морнинги сидя",
  "Seated One-arm Cable Pulley Rows": "Тяга нижнего блока одной рукой сидя",
  "Seated One-Arm Dumbbell Palms-Down Wrist Curl": "Сгибания запястий с гантелью одной рукой ладонями вниз сидя",
  "Seated One-Arm Dumbbell Palms-Up Wrist Curl": "Сгибания запястий с гантелью одной рукой ладонями вверх сидя",
  "Seated Palm-Up Barbell Wrist Curl": "Сгибания запястий со штангой ладонями вверх сидя",
  "Seated Palms-Down Barbell Wrist Curl": "Сгибания запястий со штангой ладонями вниз сидя",
  "Seated Side Lateral Raise": "Отведения в стороны сидя",
  "Seated Triceps Press": "Жим на трицепс сидя",
  "Seated Two-Arm Palms-Up Low-Pulley Wrist Curl": "Сгибания запястий на нижнем блоке ладонями вверх сидя",
  "See-Saw Press (Alternating Side Press)": "Попеременный боковой жим («качели»)",
  "Shotgun Row": "Тяга «дробовик»",
  "Side Laterals to Front Raise": "Отведения в стороны с переходом в подъём перед собой",
  "Single Dumbbell Raise": "Подъёмы одной гантели перед собой",
  "Single-Arm Cable Crossover": "Кроссовер одной рукой на блоке",
  "Single-Arm Linear Jammer": "Толчок по прямой одной рукой",
  "Single-Leg Leg Extension": "Разгибания ног сидя на одной ноге",
  "Smith Incline Shoulder Raise": "Подъёмы в тренажёре Смита на наклонной",
  "Smith Machine Behind the Back Shrug": "Шраги в тренажёре Смита за спиной",
  "Smith Machine Bench Press": "Жим лёжа в тренажёре Смита",
  "Smith Machine Bent Over Row": "Тяга в наклоне в тренажёре Смита",
  "Smith Machine Calf Raise": "Подъёмы на носки в тренажёре Смита",
  "Smith Machine Close-Grip Bench Press": "Жим узким хватом в тренажёре Смита",
  "Smith Machine Decline Press": "Жим на наклонной вниз в тренажёре Смита",
  "Smith Machine Hang Power Clean": "Взятие на грудь с виса в тренажёре Смита",
  "Smith Machine Hip Raise": "Подъём таза в тренажёре Смита",
  "Smith Machine Incline Bench Press": "Жим на наклонной скамье в тренажёре Смита",
  "Smith Machine Leg Press": "Жим ногами в тренажёре Смита",
  "Smith Machine One-Arm Upright Row": "Тяга к подбородку одной рукой в тренажёре Смита",
  "Smith Machine Overhead Shoulder Press": "Жим над головой в тренажёре Смита",
  "Smith Machine Pistol Squat": "Пистолетик в тренажёре Смита",
  "Smith Machine Reverse Calf Raises": "Обратные подъёмы на носки в тренажёре Смита",
  "Smith Machine Squat": "Приседания в тренажёре Смита",
  "Smith Machine Stiff-Legged Deadlift": "Мёртвая тяга на прямых ногах в тренажёре Смита",
  "Smith Machine Upright Row": "Тяга к подбородку в тренажёре Смита",
  "Smith Single-Leg Split Squat": "Приседания в ножницы на одной ноге в тренажёре Смита",
  "Snatch Balance": "Рывковый баланс",
  "Snatch Deadlift": "Становая тяга рывка",
  "Snatch from Blocks": "Рывок с блоков",
  "Snatch Pull": "Тяга рывка",
  "Snatch Shrug": "Шраги рывковым хватом",
  "Snatch": "Рывок штанги",
  "Speed Box Squat": "Скоростные приседания на ящик",
  "Speed Squats": "Скоростные приседания",
  "Spell Caster": "«Чародей» (дуги с гирей перед собой)",
  "Spider Curl": "Сгибания «паук»",
  "Split Clean": "Взятие на грудь в ножницы",
  "Split Jerk": "Толчок в ножницы",
  "Split Snatch": "Рывок в ножницы",
  "Squat Jerk": "Толчок с подседом",
  "Squat with Bands": "Приседания с резинами",
  "Squat with Chains": "Приседания с цепями",
  "Squat with Plate Movers": "Приседания с блином (plate movers)",
  "Stairmaster": "Степпер-лестница (Stairmaster)",
  "Standing Alternating Dumbbell Press": "Попеременный жим гантелей стоя",
  "Standing Barbell Press Behind Neck": "Жим штанги из-за головы стоя",
  "Standing Bent-Over One-Arm Dumbbell Triceps Extension": "Разгибания гантели одной рукой в наклоне стоя",
  "Standing Bent-Over Two-Arm Dumbbell Triceps Extension": "Разгибания гантелей двумя руками в наклоне стоя",
  "Standing Bradford Press": "Жим Брэдфорда стоя",
  "Standing Cable Chest Press": "Жим на грудь на блоке стоя",
  "Standing Cable Lift": "Подъём на блоке стоя (диагональ)",
  "Standing Cable Wood Chop": "«Рубка дров» на блоке стоя",
  "Standing Concentration Curl": "Концентрированные сгибания стоя",
  "Standing Dumbbell Calf Raise": "Подъёмы на носки с гантелями стоя",
  "Standing Dumbbell Press": "Жим гантелей стоя",
  "Standing Dumbbell Reverse Curl": "Обратные сгибания с гантелями стоя",
  "Standing Dumbbell Straight-Arm Front Delt Raise Above Head": "Подъёмы прямых рук с гантелями над головой",
  "Standing Dumbbell Upright Row": "Тяга гантелей к подбородку стоя",
  "Standing Front Barbell Raise Over Head": "Подъём штанги перед собой над головой",
  "Standing Inner-Biceps Curl": "Сгибания на внутреннюю головку бицепса стоя",
  "Standing Leg Curl": "Сгибания ног стоя в тренажёре",
  "Standing Low-Pulley Deltoid Raise": "Подъёмы на дельты на нижнем блоке стоя",
  "Standing Low-Pulley One-Arm Triceps Extension": "Разгибания на трицепс одной рукой на нижнем блоке стоя",
  "Standing One-Arm Cable Curl": "Сгибания на блоке одной рукой стоя",
  "Standing One-Arm Dumbbell Curl Over Incline Bench": "Сгибания с гантелью одной рукой через наклонную скамью",
  "Standing One-Arm Dumbbell Triceps Extension": "Разгибания гантели из-за головы одной рукой стоя",
  "Standing Overhead Barbell Triceps Extension": "Французский жим штанги стоя",
  "Standing Palm-In One-Arm Dumbbell Press": "Жим гантели одной рукой нейтральным хватом стоя",
  "Standing Palms-In Dumbbell Press": "Жим гантелей нейтральным хватом стоя",
  "Standing Palms-Up Barbell Behind The Back Wrist Curl": "Сгибания запястий со штангой за спиной ладонями вверх",
  "Standing Rope Crunch": "Скручивания с канатом стоя",
  "Step Mill": "Степ-милл (лестница)",
  "Stiff Leg Barbell Good Morning": "Гуд морнинг на прямых ногах со штангой",
  "Stiff-Legged Barbell Deadlift": "Мёртвая тяга со штангой на прямых ногах",
  "Straight Bar Bench Mid Rows": "Тяга прямым грифом к поясу",
  "Straight Raises on Incline Bench": "Прямые подъёмы на наклонной скамье",
  "Straight-Arm Dumbbell Pullover": "Пуловер с гантелью прямыми руками",
  "Sumo Deadlift with Bands": "Сумо-становая тяга с резинами",
  "Sumo Deadlift with Chains": "Сумо-становая тяга с цепями",
  "Sumo Deadlift": "Сумо-становая тяга",
  "Tate Press": "Жим Тейта",
  "Thigh Abductor": "Отведение бедра в тренажёре",
  "Thigh Adductor": "Приведение бедра в тренажёре",
  "Tricep Dumbbell Kickback": "Отведения гантели назад на трицепс",
  "Triceps Overhead Extension with Rope": "Разгибания на трицепс из-за головы с канатом",
  "Triceps Pushdown - Rope Attachment": "Разгибания на трицепс на блоке с канатом",
  "Triceps Pushdown - V-Bar Attachment": "Разгибания на трицепс на блоке с V-рукоятью",
  "Two-Arm Dumbbell Preacher Curl": "Сгибания с гантелями на скамье Скотта",
  "Two-Arm Kettlebell Clean": "Взятие двух гирь на грудь",
  "Two-Arm Kettlebell Jerk": "Толчок двух гирь",
  "Two-Arm Kettlebell Military Press": "Армейский жим с двумя гирями",
  "Two-Arm Kettlebell Row": "Тяга двух гирь",
  "Underhand Cable Pulldowns": "Тяга верхнего блока обратным хватом",
  "Upright Cable Row": "Тяга к подбородку на блоке",
  "V-Bar Pulldown": "Тяга верхнего блока V-рукоятью",
  "Walking, Treadmill": "Ходьба на беговой дорожке",
  "Weighted Jump Squat": "Прыжковые приседания с весом",
  "Weighted Sissy Squat": "Сисси-приседания с весом",
  "Wide Stance Barbell Squat": "Приседания со штангой в широкой стойке",
  "Wide Stance Stiff Legs": "Становая на прямых ногах в широкой стойке",
  "Wide-Grip Barbell Bench Press": "Жим штанги лёжа широким хватом",
  "Wide-Grip Decline Barbell Bench Press": "Жим штанги широким хватом на наклонной вниз",
  "Wide-Grip Decline Barbell Pullover": "Пуловер со штангой широким хватом на наклонной вниз",
  "Wide-Grip Pulldown Behind The Neck": "Тяга верхнего блока за голову широким хватом",
  "Wide-Grip Standing Barbell Curl": "Сгибания со штангой широким хватом стоя",
  "Wrist Rotations with Straight Bar": "Вращения запястий с прямым грифом",
  "Zercher Squats": "Приседания Церхера",
  "Zottman Curl": "Сгибания Зоттмана",
  "Zottman Preacher Curl": "Сгибания Зоттмана на скамье Скотта",
};

// Единый словарь для translateName: приоритет у курируемых словарей.
const ALL_NAME_TRANSLATIONS = {
  ...NAME_TRANSLATIONS,
  ...GYM_EXTRA_NAME_TRANSLATIONS
};

const exercises = JSON.parse(
  fs.readFileSync(path.join(DATASET_DIR, 'dist/exercises.json'), 'utf-8')
);

// Schema-гейт датасета: enum-ы level/category/force/mechanic/equipment,
// словарь мышц, обязательные поля, уникальность id (см. exerciseImportRules.mjs).
validateDataset(exercises);

const homeExercises = exercises.filter(
  (ex) => HOME_EQUIPMENT.has(ex.equipment) && !requiresUnsupportedEquipment(ex)
);
const gymExercises = exercises.filter((ex) => GYM_IMPORT_IDS.has(ex.id));
// Tier 2: все остальные упражнения датасета с оборудованием, которое мы
// умеем маппить. Порядок: домашние → курируемые тренажерные → tier 2 —
// Bridge (числовые id 100_000+index) рассчитан на этот порядок, не менять.
const extraGymExercises = exercises.filter(
  (ex) =>
    !HOME_EQUIPMENT.has(ex.equipment) &&
    !GYM_IMPORT_IDS.has(ex.id) &&
    EQUIPMENT_IMPORT[ex.equipment]
);
const filtered = [...homeExercises, ...gymExercises, ...extraGymExercises];

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

  const nameRu = translateName(ex.name, ALL_NAME_TRANSLATIONS);
  if (!nameRu) untranslatedCount++;

  // Датасет-фото копируем только для домашних записей; тренажерные
  // (tier 1 и tier 2) идут с пустыми imageKeys — владелец готовит свои медиа.
  const isHomeEntry = HOME_EQUIPMENT.has(ex.equipment);
  const localImageKeys = [];
  if (isHomeEntry) {
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
    datasetCategory: ex.category,
    equipment: EQUIPMENT_IMPORT[ex.equipment] ?? 'bodyweight',
    level: ex.level ?? null,
    force: ex.force ?? null,
    mechanic: ex.mechanic ?? null,
    primaryMuscles: ex.primaryMuscles ?? [],
    secondaryMuscles: ex.secondaryMuscles ?? [],
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
 * Home entries (bodyweight/bands) carry dataset photos via imageKeys.
 * Gym entries are imported in two tiers:
 *  - tier 1: the curated Phase-4 allowlist (full Russian names + instructions);
 *  - tier 2: every remaining dataset exercise with supported equipment
 *    (dumbbell/barbell/cable/machine/kettlebells/e-z curl bar) — Russian
 *    names via GYM_EXTRA_NAME_TRANSLATIONS, instructionsRu stays empty and
 *    the UI falls back to instructionsEn.
 * Gym imageKeys are intentionally empty: the owner is developing his own
 * exercise media, so the UI shows the phase-1 placeholder instead of
 * dataset photos.
 *
 * datasetCategory/force/mechanic/secondaryMuscles mirror the upstream dataset
 * schema (yuhonas/free-exercise-db schema.json) and are validated by
 * importedLibrarySchema.test.ts.
 */

export interface ImportedExercise {
  id: string;
  nameEn: string;
  nameRu: string | null;
  category: 'chest' | 'back' | 'legs' | 'abs' | 'arms' | 'glutes';
  datasetCategory:
    | 'strength'
    | 'stretching'
    | 'cardio'
    | 'plyometrics'
    | 'powerlifting'
    | 'olympic weightlifting'
    | 'strongman';
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
  force: 'push' | 'pull' | 'static' | null;
  mechanic: 'isolation' | 'compound' | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
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
console.log(
  'Домашние / курируемые тренажерные / tier 2:',
  homeExercises.length,
  gymExercises.length,
  extraGymExercises.length
);
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

