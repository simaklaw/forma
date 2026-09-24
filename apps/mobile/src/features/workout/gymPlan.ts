import type { WorkoutDay } from './bodyweightPlan';

/** Gym PPL + Full Body + Upper/Lower. Ids 1–9 and 22–24 preserved for existing logs. */
export const GYM_PLAN: WorkoutDay[] = [
  {
    id: 'push',
    name: 'Жим — грудь, плечи, трицепс',
    meta: '≈50 мин',
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
        note: 'Базовый жим для верха тела — лопатки сведены и прижаты к скамье весь подход, гриф идёт к нижней трети груди, а не к шее.',
        wgerSearchTerm: 'Bench Press'
      },
      {
        id: 5,
        index: 2,
        name: 'Жим гантелей сидя',
        workingWeight: 18,
        workingReps: 10,
        totalSets: 3,
        restSeconds: 90,
        targetMuscles: ['shoulders', 'triceps'],
        note: 'Изоляция передней и средней дельты после тяжёлого жима — амплитуда полная, без раскачки корпусом.',
        wgerSearchTerm: 'Dumbbell Shoulder Press'
      },
      {
        id: 6,
        index: 3,
        name: 'Разгибания на трицепс на блоке',
        workingWeight: 25,
        workingReps: 12,
        totalSets: 3,
        restSeconds: 60,
        targetMuscles: ['triceps'],
        note: 'Завершающая изоляция — локти прижаты к корпусу весь подход, работает только предплечье.',
        wgerSearchTerm: 'Triceps Pushdown'
      }
    ]
  },
  {
    id: 'pull',
    name: 'Тяга — спина, задняя дельта, бицепс',
    meta: '≈50 мин',
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
        note: 'Корпус фиксирован под 45°, спина нейтральная весь подход — тянем локтями к тазу, не руками к груди.',
        wgerSearchTerm: 'Bent Over Row'
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
        note: 'Широчайшие в приоритете — тянем локтями вниз-назад, не грудью вверх навстречу рукояти.',
        wgerSearchTerm: 'Lat Pulldown'
      },
      {
        id: 9,
        index: 3,
        name: 'Сгибания на бицепс со штангой',
        workingWeight: 30,
        workingReps: 10,
        totalSets: 3,
        restSeconds: 60,
        targetMuscles: ['biceps'],
        note: 'Локти неподвижны у корпуса — амплитуда за счёт предплечья, не за счёт раскачки плечом.',
        wgerSearchTerm: 'Barbell Curl'
      }
    ]
  },
  {
    id: 'legs',
    name: 'Ноги — сила',
    meta: '≈45 мин',
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
        note: 'Почему RIR 1–3: высокопороговые волокна рекрутируются только у отказа (принцип Хеннемана) — так работает механическое напряжение на гипертрофию.',
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
        note: 'Тяжёлый базовый подход низкой повторности — держите нейтральную спину и не гонитесь за амплитудой в ущерб технике на последних повторах.',
        wgerSearchTerm: 'Deadlift'
      },
      {
        id: 3,
        index: 3,
        name: 'Выпады с гантелями',
        workingWeight: 14,
        workingReps: 12,
        totalSets: 3,
        restSeconds: 60,
        targetMuscles: ['quads', 'glutes', 'hamstrings'],
        note: 'Завершающее упражнение на объём: короткий отдых держит метаболический стресс высоким, вес — умеренный, фокус на контролируемом негативе.',
        wgerSearchTerm: 'Dumbbell Lunge'
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
        note: 'Full body: умеренный вес, техника важнее отказа. Глубина комфортная, колени по носкам.',
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
        note: 'После ног — верх. Лопатки сведены, гантели сходятся вверху без удара.',
        wgerSearchTerm: 'Dumbbell Bench Press'
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
        note: 'Одна рука на скамье, спина параллельна полу — тянем локтем к тазу.',
        wgerSearchTerm: 'Dumbbell Row'
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
        note: 'Upper day: контролируемый негатив, лопатки сведены, без отрыва таза.',
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
        note: 'Тяните локтем к тазу, корпус стабилен — баланс жиму в этот же день.',
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
        note: 'Локти чуть согнуты, без раскачки; акцент на средней дельте.',
        wgerSearchTerm: 'Lateral Raise'
      }
    ]
  },
  {
    id: 'lower',
    name: 'Низ — lower',
    meta: '≈45 мин',
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
        note: 'Lower day: глубина комфортная, колени по носкам, спина нейтральная.',
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
        note: 'Таз назад, гриф вдоль бёдер, лёгкий сгиб в коленях — акцент на бицепс бедра.',
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
        note: 'Переднее бедро параллельно полу, колено не заваливается внутрь.',
        wgerSearchTerm: 'Dumbbell Lunge'
      }
    ]
  }
];
