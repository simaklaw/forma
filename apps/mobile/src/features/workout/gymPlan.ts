import type { WorkoutDay } from './bodyweightPlan';

/**
 * Gym PPL + Full Body + Upper/Lower + arms/shoulders.
 * Ids 1–9 and 22–30 preserved for existing logs.
 * New ids 31+ from wger-aligned names (offline catalog; photos via wgerSearchTerm).
 */
export const GYM_PLAN: WorkoutDay[] = [
  {
    id: 'push',
    name: 'Жим — грудь, плечи, трицепс',
    meta: '≈55 мин',
    exercises: [
      {
        id: 4,
        index: 1,
        name: 'Жим штанги лёжа',
        workingWeight: 60,
        workingReps: 6,
        totalSets: 4,
        restSeconds: 120,
        targetMuscles: ['chest', 'shoulders', 'triceps'],
        note: 'Базовый жим — лопатки сведены, гриф к нижней трети груди.',
        wgerSearchTerm: 'Bench Press'
      },
      {
        id: 31,
        index: 2,
        name: 'Жим гантелей на наклонной',
        workingWeight: 22,
        workingReps: 10,
        totalSets: 3,
        restSeconds: 90,
        targetMuscles: ['chest', 'shoulders'],
        note: 'Верх груди: скамья 30–45°, гантели сходятся вверху без удара.',
        wgerSearchTerm: 'Incline Bench Press'
      },
      {
        id: 5,
        index: 3,
        name: 'Жим гантелей сидя',
        workingWeight: 18,
        workingReps: 10,
        totalSets: 3,
        restSeconds: 90,
        targetMuscles: ['shoulders', 'triceps'],
        note: 'Полная амплитуда, без раскачки корпусом.',
        wgerSearchTerm: 'Dumbbell Shoulder Press'
      },
      {
        id: 32,
        index: 4,
        name: 'Разведения гантелей',
        workingWeight: 12,
        workingReps: 12,
        totalSets: 3,
        restSeconds: 60,
        targetMuscles: ['chest'],
        note: 'Лёгкий сгиб в локтях, растяжка внизу без боли в плече.',
        wgerSearchTerm: 'Fly With Dumbbells'
      },
      {
        id: 6,
        index: 5,
        name: 'Разгибания на трицепс на блоке',
        workingWeight: 25,
        workingReps: 12,
        totalSets: 3,
        restSeconds: 60,
        targetMuscles: ['triceps'],
        note: 'Локти прижаты, работает только предплечье.',
        wgerSearchTerm: 'Triceps Pushdown'
      }
    ]
  },
  {
    id: 'pull',
    name: 'Тяга — спина, задняя дельта, бицепс',
    meta: '≈55 мин',
    exercises: [
      {
        id: 7,
        index: 1,
        name: 'Тяга штанги в наклоне',
        workingWeight: 60,
        workingReps: 8,
        totalSets: 4,
        restSeconds: 120,
        targetMuscles: ['back', 'lowerback', 'biceps'],
        note: 'Корпус ~45°, тянем локтями к тазу.',
        wgerSearchTerm: 'Bent Over Rowing'
      },
      {
        id: 8,
        index: 2,
        name: 'Тяга верхнего блока',
        workingWeight: 50,
        workingReps: 10,
        totalSets: 3,
        restSeconds: 90,
        targetMuscles: ['back', 'biceps'],
        note: 'Локти вниз-назад, не грудью к рукояти.',
        wgerSearchTerm: 'Lat Pulldown'
      },
      {
        id: 33,
        index: 3,
        name: 'Тяга горизонтального блока',
        workingWeight: 45,
        workingReps: 10,
        totalSets: 3,
        restSeconds: 75,
        targetMuscles: ['back', 'biceps'],
        note: 'Грудь вверх, лопатки сводятся в конце тяги.',
        wgerSearchTerm: 'Seated Cable Row'
      },
      {
        id: 9,
        index: 4,
        name: 'Сгибания на бицепс со штангой',
        workingWeight: 30,
        workingReps: 10,
        totalSets: 3,
        restSeconds: 60,
        targetMuscles: ['biceps'],
        note: 'Локти у корпуса, без читинга.',
        wgerSearchTerm: 'Biceps Curls With Barbell'
      },
      {
        id: 34,
        index: 5,
        name: 'Молотковые сгибания',
        workingWeight: 14,
        workingReps: 12,
        totalSets: 3,
        restSeconds: 60,
        targetMuscles: ['biceps'],
        note: 'Нейтральный хват, контроль негатива.',
        wgerSearchTerm: 'Hammer Curls'
      }
    ]
  },
  {
    id: 'legs',
    name: 'Ноги — сила',
    meta: '≈55 мин',
    exercises: [
      {
        id: 1,
        index: 1,
        name: 'Приседания со штангой',
        workingWeight: 80,
        workingReps: 8,
        totalSets: 4,
        restSeconds: 90,
        targetMuscles: ['quads', 'glutes', 'core'],
        note: 'Глубина комфортная, колени по носкам.',
        wgerSearchTerm: 'Barbell Squat'
      },
      {
        id: 2,
        index: 2,
        name: 'Становая тяга',
        workingWeight: 100,
        workingReps: 5,
        totalSets: 3,
        restSeconds: 120,
        targetMuscles: ['hamstrings', 'glutes', 'back', 'core'],
        note: 'Нейтральная спина, не гонитесь за весом в ущерб технике.',
        wgerSearchTerm: 'Deadlifts'
      },
      {
        id: 35,
        index: 3,
        name: 'Жим ногами',
        workingWeight: 120,
        workingReps: 12,
        totalSets: 3,
        restSeconds: 90,
        targetMuscles: ['quads', 'glutes'],
        note: 'Поясница прижата, не блокируйте колени.',
        wgerSearchTerm: 'Leg Press'
      },
      {
        id: 3,
        index: 4,
        name: 'Выпады с гантелями',
        workingWeight: 14,
        workingReps: 12,
        totalSets: 3,
        restSeconds: 60,
        targetMuscles: ['quads', 'glutes', 'hamstrings'],
        note: 'Контролируемый негатив, колено не заваливается внутрь.',
        wgerSearchTerm: 'Dumbbell Lunges Walking'
      },
      {
        id: 36,
        index: 5,
        name: 'Подъёмы на носки',
        workingWeight: 40,
        workingReps: 15,
        totalSets: 3,
        restSeconds: 45,
        targetMuscles: ['calves'],
        note: 'Полная амплитуда, пауза вверху.',
        wgerSearchTerm: 'Standing Calf Raises'
      }
    ]
  },
  {
    id: 'full',
    name: 'Всё тело — full body',
    meta: '≈55 мин',
    exercises: [
      {
        id: 22,
        index: 1,
        name: 'Приседания со штангой',
        workingWeight: 70,
        workingReps: 8,
        totalSets: 3,
        restSeconds: 90,
        targetMuscles: ['quads', 'glutes', 'core'],
        note: 'Full body: техника важнее отказа.',
        wgerSearchTerm: 'Barbell Squat'
      },
      {
        id: 23,
        index: 2,
        name: 'Жим гантелей лёжа',
        workingWeight: 22,
        workingReps: 10,
        totalSets: 3,
        restSeconds: 90,
        targetMuscles: ['chest', 'shoulders', 'triceps'],
        note: 'Лопатки сведены, гантели сходятся вверху.',
        wgerSearchTerm: 'Benchpress Dumbbells'
      },
      {
        id: 24,
        index: 3,
        name: 'Тяга гантели в наклоне',
        workingWeight: 24,
        workingReps: 10,
        totalSets: 3,
        restSeconds: 75,
        targetMuscles: ['back', 'biceps'],
        note: 'Одна рука на скамье, тянем локтем к тазу.',
        wgerSearchTerm: 'Bent Over Dumbbell Rows'
      },
      {
        id: 37,
        index: 4,
        name: 'Румынская тяга',
        workingWeight: 50,
        workingReps: 8,
        totalSets: 3,
        restSeconds: 90,
        targetMuscles: ['hamstrings', 'glutes', 'back'],
        note: 'Таз назад, лёгкий сгиб в коленях.',
        wgerSearchTerm: 'Romanian Deadlift'
      }
    ]
  },
  {
    id: 'upper',
    name: 'Верх — upper',
    meta: '≈50 мин',
    exercises: [
      {
        id: 25,
        index: 1,
        name: 'Жим штанги лёжа',
        workingWeight: 55,
        workingReps: 8,
        totalSets: 3,
        restSeconds: 90,
        targetMuscles: ['chest', 'shoulders', 'triceps'],
        note: 'Контролируемый негатив, без отрыва таза.',
        wgerSearchTerm: 'Bench Press'
      },
      {
        id: 26,
        index: 2,
        name: 'Тяга гантели в наклоне',
        workingWeight: 28,
        workingReps: 10,
        totalSets: 3,
        restSeconds: 75,
        targetMuscles: ['back', 'biceps'],
        note: 'Баланс жиму в этот же день.',
        wgerSearchTerm: 'Dumbbell Row'
      },
      {
        id: 27,
        index: 3,
        name: 'Разведение гантелей в стороны',
        workingWeight: 10,
        workingReps: 12,
        totalSets: 3,
        restSeconds: 60,
        targetMuscles: ['shoulders'],
        note: 'Локти чуть согнуты, акцент на средней дельте.',
        wgerSearchTerm: 'Lateral Raises'
      },
      {
        id: 38,
        index: 4,
        name: 'Разведения на заднюю дельту',
        workingWeight: 8,
        workingReps: 12,
        totalSets: 3,
        restSeconds: 60,
        targetMuscles: ['shoulders', 'back'],
        note: 'Корпус наклонён, без раскачки.',
        wgerSearchTerm: 'Rear Delt Raises'
      }
    ]
  },
  {
    id: 'lower',
    name: 'Низ — lower',
    meta: '≈50 мин',
    exercises: [
      {
        id: 28,
        index: 1,
        name: 'Приседания со штангой',
        workingWeight: 75,
        workingReps: 6,
        totalSets: 4,
        restSeconds: 120,
        targetMuscles: ['quads', 'glutes', 'core'],
        note: 'Спина нейтральная, глубина комфортная.',
        wgerSearchTerm: 'Barbell Squat'
      },
      {
        id: 29,
        index: 2,
        name: 'Румынская тяга',
        workingWeight: 60,
        workingReps: 8,
        totalSets: 3,
        restSeconds: 90,
        targetMuscles: ['hamstrings', 'glutes', 'back'],
        note: 'Гриф вдоль бёдер, акцент на бицепс бедра.',
        wgerSearchTerm: 'Romanian Deadlift'
      },
      {
        id: 30,
        index: 3,
        name: 'Выпады с гантелями',
        workingWeight: 14,
        workingReps: 10,
        totalSets: 3,
        restSeconds: 75,
        targetMuscles: ['quads', 'glutes', 'hamstrings'],
        note: 'Переднее бедро параллельно полу.',
        wgerSearchTerm: 'Dumbbell Lunge'
      },
      {
        id: 39,
        index: 4,
        name: 'Сгибания ног лёжа',
        workingWeight: 35,
        workingReps: 12,
        totalSets: 3,
        restSeconds: 60,
        targetMuscles: ['hamstrings'],
        note: 'Без рывка, пауза вверху.',
        wgerSearchTerm: 'Leg Curls'
      }
    ]
  },
  {
    id: 'shoulders',
    name: 'Плечи — дельты',
    meta: '≈40 мин',
    exercises: [
      {
        id: 40,
        index: 1,
        name: 'Армейский жим',
        workingWeight: 40,
        workingReps: 8,
        totalSets: 4,
        restSeconds: 90,
        targetMuscles: ['shoulders', 'triceps'],
        note: 'Рёбра вниз, не прогибайте поясницу.',
        wgerSearchTerm: 'Shoulder Press, Barbell'
      },
      {
        id: 41,
        index: 2,
        name: 'Махи в стороны',
        workingWeight: 10,
        workingReps: 12,
        totalSets: 3,
        restSeconds: 60,
        targetMuscles: ['shoulders'],
        note: 'Контроль, без читинга.',
        wgerSearchTerm: 'Lateral Raises'
      },
      {
        id: 42,
        index: 3,
        name: 'Подъёмы перед собой',
        workingWeight: 10,
        workingReps: 12,
        totalSets: 3,
        restSeconds: 60,
        targetMuscles: ['shoulders'],
        note: 'До уровня плеч, медленный негатив.',
        wgerSearchTerm: 'Front Raises'
      },
      {
        id: 43,
        index: 4,
        name: 'Шраги с гантелями',
        workingWeight: 20,
        workingReps: 12,
        totalSets: 3,
        restSeconds: 60,
        targetMuscles: ['shoulders', 'back'],
        note: 'Плечи вверх-назад, без вращения.',
        wgerSearchTerm: 'Shrugs, Dumbbells'
      }
    ]
  },
  {
    id: 'arms',
    name: 'Руки — бицепс и трицепс',
    meta: '≈40 мин',
    exercises: [
      {
        id: 44,
        index: 1,
        name: 'Сгибания со штангой',
        workingWeight: 28,
        workingReps: 10,
        totalSets: 3,
        restSeconds: 60,
        targetMuscles: ['biceps'],
        note: 'Локти на месте.',
        wgerSearchTerm: 'Biceps Curls With Barbell'
      },
      {
        id: 45,
        index: 2,
        name: 'Молотковые сгибания',
        workingWeight: 14,
        workingReps: 12,
        totalSets: 3,
        restSeconds: 60,
        targetMuscles: ['biceps'],
        note: 'Нейтральный хват.',
        wgerSearchTerm: 'Hammer Curls'
      },
      {
        id: 46,
        index: 3,
        name: 'Французский жим',
        workingWeight: 20,
        workingReps: 10,
        totalSets: 3,
        restSeconds: 75,
        targetMuscles: ['triceps'],
        note: 'Локти не разъезжаются.',
        wgerSearchTerm: 'Skullcrusher'
      },
      {
        id: 47,
        index: 4,
        name: 'Разгибания на блоке',
        workingWeight: 25,
        workingReps: 12,
        totalSets: 3,
        restSeconds: 60,
        targetMuscles: ['triceps'],
        note: 'Локти прижаты к корпусу.',
        wgerSearchTerm: 'Tricep Pushdown'
      }
    ]
  }
];
