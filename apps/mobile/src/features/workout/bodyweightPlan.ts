import type { ExerciseDef } from './ExerciseSheet';

export interface WorkoutDay {
  id: string;
  name: string;
  meta: string;
  exercises: ExerciseDef[];
}

/** Home bodyweight catalog — no barbell required. workingWeight 0 = bodyweight. */
export const WORKOUT_PLAN: WorkoutDay[] = [
  {
    id: 'chest',
    name: 'Грудь — отжимания',
    meta: '≈30 мин',
    exercises: [
      {
        id: 10,
        index: 1,
        name: 'Отжимания',
        workingWeight: 0,
        workingReps: 12,
        totalSets: 3,
        restSeconds: 60,
        targetMuscles: ['chest', 'triceps'],
        note: 'Корпус прямой, локти ~45° к телу.',
        wgerSearchTerm: 'Push-up',
        mediaKey: 'pushup'
      },
      {
        id: 48,
        index: 2,
        name: 'Отжимания узким хватом',
        workingWeight: 0,
        workingReps: 10,
        totalSets: 3,
        restSeconds: 60,
        targetMuscles: ['chest', 'triceps'],
        note: 'Локти ближе к корпусу — акцент на трицепс.',
        wgerSearchTerm: 'Close-grip Press-ups',
        mediaKey: 'pushup'
      },
      {
        id: 49,
        index: 3,
        name: 'Отжимания с возвышения ног',
        workingWeight: 0,
        workingReps: 8,
        totalSets: 3,
        restSeconds: 75,
        targetMuscles: ['chest', 'shoulders'],
        note: 'Ноги на стуле — нагрузка выше.',
        wgerSearchTerm: 'Decline Push-Ups',
        mediaKey: 'pushup'
      }
    ]
  },
  {
    id: 'back',
    name: 'Спина — подтягивания и тяга',
    meta: '≈35 мин',
    exercises: [
      {
        id: 11,
        index: 1,
        name: 'Подтягивания',
        workingWeight: 0,
        workingReps: 6,
        totalSets: 3,
        restSeconds: 90,
        targetMuscles: ['back', 'biceps'],
        note: 'Лопатки вниз-назад, без рывка.',
        wgerSearchTerm: 'Pull-ups',
        mediaKey: 'pullup'
      },
      {
        id: 50,
        index: 2,
        name: 'Австралийские подтягивания',
        workingWeight: 0,
        workingReps: 10,
        totalSets: 3,
        restSeconds: 60,
        targetMuscles: ['back', 'biceps'],
        note: 'Тело прямой линией, грудь к перекладине.',
        wgerSearchTerm: 'Inverted Rows',
        mediaKey: 'pullup'
      },
      {
        id: 12,
        index: 3,
        name: 'Тяга с резиной',
        workingWeight: 0,
        workingReps: 12,
        totalSets: 3,
        restSeconds: 60,
        targetMuscles: ['back', 'biceps'],
        note: 'Тяните локтями к тазу.',
        wgerSearchTerm: 'Band row',
        mediaKey: 'row-band'
      }
    ]
  },
  {
    id: 'legs',
    name: 'Ноги — присед и выпады',
    meta: '≈35 мин',
    exercises: [
      {
        id: 13,
        index: 1,
        name: 'Приседания',
        workingWeight: 0,
        workingReps: 15,
        totalSets: 4,
        restSeconds: 75,
        targetMuscles: ['quads', 'glutes', 'core'],
        note: 'Вес в пятках, колени по носкам.',
        wgerSearchTerm: 'Squat',
        mediaKey: 'squat'
      },
      {
        id: 14,
        index: 2,
        name: 'Выпады',
        workingWeight: 0,
        workingReps: 10,
        totalSets: 3,
        restSeconds: 60,
        targetMuscles: ['quads', 'glutes', 'hamstrings'],
        note: 'Переднее бедро параллельно полу.',
        wgerSearchTerm: 'Lunges',
        mediaKey: 'lunge'
      },
      {
        id: 51,
        index: 3,
        name: 'Болгарские выпады',
        workingWeight: 0,
        workingReps: 8,
        totalSets: 3,
        restSeconds: 75,
        targetMuscles: ['quads', 'glutes'],
        note: 'Задняя нога на стуле, корпус вертикально.',
        wgerSearchTerm: 'Bulgarian split squats',
        mediaKey: 'lunge'
      },
      {
        id: 52,
        index: 4,
        name: 'Обратные выпады',
        workingWeight: 0,
        workingReps: 10,
        totalSets: 3,
        restSeconds: 60,
        targetMuscles: ['quads', 'glutes'],
        note: 'Шаг назад, колено к полу без удара.',
        wgerSearchTerm: 'Reverse lunges',
        mediaKey: 'lunge'
      }
    ]
  },
  {
    id: 'core',
    name: 'Пресс — планка и контроль',
    meta: '≈25 мин',
    exercises: [
      {
        id: 15,
        index: 1,
        name: 'Планка',
        workingWeight: 0,
        workingReps: 40,
        totalSets: 3,
        restSeconds: 45,
        targetMuscles: ['core'],
        note: 'Повторы = секунды. Таз не провисает.',
        wgerSearchTerm: 'Plank',
        mediaKey: 'plank'
      },
      {
        id: 16,
        index: 2,
        name: 'Мёртвый жук',
        workingWeight: 0,
        workingReps: 10,
        totalSets: 3,
        restSeconds: 45,
        targetMuscles: ['core'],
        note: 'Поясница прижата к полу.',
        wgerSearchTerm: 'Dead bug',
        mediaKey: 'dead-bug'
      },
      {
        id: 17,
        index: 3,
        name: 'Боковая планка',
        workingWeight: 0,
        workingReps: 30,
        totalSets: 3,
        restSeconds: 45,
        targetMuscles: ['core'],
        note: 'Повторы = секунды на сторону.',
        wgerSearchTerm: 'Side plank',
        mediaKey: 'side-plank'
      },
      {
        id: 53,
        index: 4,
        name: 'Скручивания',
        workingWeight: 0,
        workingReps: 15,
        totalSets: 3,
        restSeconds: 40,
        targetMuscles: ['core'],
        note: 'Лопатки отрываются, поясница на полу.',
        wgerSearchTerm: 'Crunches',
        mediaKey: 'plank'
      },
      {
        id: 54,
        index: 5,
        name: 'Планка с касанием плеч',
        workingWeight: 0,
        workingReps: 12,
        totalSets: 3,
        restSeconds: 45,
        targetMuscles: ['core'],
        note: 'Таз стабилен, без раскачки.',
        wgerSearchTerm: 'Plank Shoulder Taps',
        mediaKey: 'plank'
      }
    ]
  },
  {
    id: 'arms',
    name: 'Руки — от стула и жим',
    meta: '≈30 мин',
    exercises: [
      {
        id: 18,
        index: 1,
        name: 'Отжимания от стула',
        workingWeight: 0,
        workingReps: 10,
        totalSets: 3,
        restSeconds: 60,
        targetMuscles: ['triceps'],
        note: 'Плечи вниз, локти назад.',
        wgerSearchTerm: 'Chair dip',
        mediaKey: 'chair-dip'
      },
      {
        id: 55,
        index: 2,
        name: 'Отжимания от пола на трицепс',
        workingWeight: 0,
        workingReps: 12,
        totalSets: 3,
        restSeconds: 60,
        targetMuscles: ['triceps'],
        note: 'Узкая постановка рук.',
        wgerSearchTerm: 'Floor dips',
        mediaKey: 'chair-dip'
      },
      {
        id: 19,
        index: 3,
        name: 'Жим над головой с резиной',
        workingWeight: 0,
        workingReps: 12,
        totalSets: 3,
        restSeconds: 60,
        targetMuscles: ['shoulders', 'triceps'],
        note: 'Рёбра вниз, не прогибайте поясницу.',
        wgerSearchTerm: 'Shoulder press',
        mediaKey: 'shoulder-press'
      }
    ]
  },
  {
    id: 'glutes',
    name: 'Ягодицы — мостик',
    meta: '≈25 мин',
    exercises: [
      {
        id: 20,
        index: 1,
        name: 'Ягодичный мостик',
        workingWeight: 0,
        workingReps: 15,
        totalSets: 3,
        restSeconds: 45,
        targetMuscles: ['glutes', 'hamstrings'],
        note: 'Сжимайте ягодицы вверху.',
        wgerSearchTerm: 'Glute Bridge',
        mediaKey: 'glute-bridge'
      },
      {
        id: 21,
        index: 2,
        name: 'Ягодичный мостик с опорой',
        workingWeight: 0,
        workingReps: 12,
        totalSets: 3,
        restSeconds: 60,
        targetMuscles: ['glutes'],
        note: 'Лопатки на опоре.',
        wgerSearchTerm: 'Hip thrust',
        mediaKey: 'hip-thrust'
      },
      {
        id: 56,
        index: 3,
        name: 'Отведение ноги назад',
        workingWeight: 0,
        workingReps: 12,
        totalSets: 3,
        restSeconds: 45,
        targetMuscles: ['glutes'],
        note: 'На четвереньках, без прогиба поясницы.',
        wgerSearchTerm: 'Kneeling kickbacks',
        mediaKey: 'glute-bridge'
      },
      {
        id: 57,
        index: 4,
        name: 'Зашагивания',
        workingWeight: 0,
        workingReps: 10,
        totalSets: 3,
        restSeconds: 60,
        targetMuscles: ['glutes', 'quads'],
        note: 'Вся стопа на ступени, толкайтесь пяткой.',
        wgerSearchTerm: 'Step-ups',
        mediaKey: 'lunge'
      }
    ]
  },
  {
    id: 'full-home',
    name: 'Дом · всё тело',
    meta: '≈30 мин',
    exercises: [
      {
        id: 58,
        index: 1,
        name: 'Приседания',
        workingWeight: 0,
        workingReps: 15,
        totalSets: 3,
        restSeconds: 60,
        targetMuscles: ['quads', 'glutes'],
        note: 'Разминка всего тела — техника прежде всего.',
        wgerSearchTerm: 'Squat',
        mediaKey: 'squat'
      },
      {
        id: 59,
        index: 2,
        name: 'Отжимания',
        workingWeight: 0,
        workingReps: 10,
        totalSets: 3,
        restSeconds: 60,
        targetMuscles: ['chest', 'triceps'],
        note: 'Корпус прямой.',
        wgerSearchTerm: 'Push-up',
        mediaKey: 'pushup'
      },
      {
        id: 60,
        index: 3,
        name: 'Ягодичный мостик',
        workingWeight: 0,
        workingReps: 15,
        totalSets: 3,
        restSeconds: 45,
        targetMuscles: ['glutes'],
        note: 'Пауза вверху.',
        wgerSearchTerm: 'Glute Bridge',
        mediaKey: 'glute-bridge'
      },
      {
        id: 61,
        index: 4,
        name: 'Планка',
        workingWeight: 0,
        workingReps: 40,
        totalSets: 3,
        restSeconds: 45,
        targetMuscles: ['core'],
        note: 'Секунды в упоре.',
        wgerSearchTerm: 'Plank',
        mediaKey: 'plank'
      },
      {
        id: 62,
        index: 5,
        name: 'Выпады',
        workingWeight: 0,
        workingReps: 10,
        totalSets: 3,
        restSeconds: 60,
        targetMuscles: ['quads', 'glutes'],
        note: 'По 10 на ногу.',
        wgerSearchTerm: 'Lunges',
        mediaKey: 'lunge'
      }
    ]
  }
];
