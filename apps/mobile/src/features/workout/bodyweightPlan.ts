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
    meta: '≈25 мин',
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
        note: 'Корпус прямой, локти ~45° к телу. Грудь почти касается пола.',
        wgerSearchTerm: 'Push-up'
      }
    ]
  },
  {
    id: 'back',
    name: 'Спина — подтягивания и тяга',
    meta: '≈30 мин',
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
        note: 'Лопатки вниз-назад. Подбородок выше перекладины без рывка.',
        wgerSearchTerm: 'Pull-ups'
      },
      {
        id: 12,
        index: 2,
        name: 'Тяга с резиной',
        workingWeight: 0,
        workingReps: 12,
        totalSets: 3,
        restSeconds: 60,
        targetMuscles: ['back', 'biceps'],
        note: 'Тяните локтями к тазу, корпус не раскачивается.',
        wgerSearchTerm: 'Band row'
      }
    ]
  },
  {
    id: 'legs',
    name: 'Ноги — присед и выпады',
    meta: '≈30 мин',
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
        note: 'Вес в пятках, колени по направлению носков, спина нейтральная.',
        wgerSearchTerm: 'Squat'
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
        note: 'Переднее бедро параллельно полу, колено не заваливается внутрь.',
        wgerSearchTerm: 'Lunge'
      }
    ]
  },
  {
    id: 'core',
    name: 'Пресс — планка и контроль',
    meta: '≈20 мин',
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
        note: 'Повторы = секунды. Таз не провисает, рёбра вниз.',
        wgerSearchTerm: 'Plank'
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
        note: 'Поясница прижата к полу. Противоположные рука и нога.',
        wgerSearchTerm: 'Dead bug'
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
        note: 'Повторы = секунды на сторону. Плечо над локтем.',
        wgerSearchTerm: 'Side plank'
      }
    ]
  },
  {
    id: 'arms',
    name: 'Руки — от стула и жим',
    meta: '≈25 мин',
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
        note: 'Плечи вниз, локти назад. Не проседайте в шее.',
        wgerSearchTerm: 'Chair dip'
      },
      {
        id: 19,
        index: 2,
        name: 'Жим над головой с резиной',
        workingWeight: 0,
        workingReps: 12,
        totalSets: 3,
        restSeconds: 60,
        targetMuscles: ['shoulders', 'triceps'],
        note: 'Рёбра вниз, не прогибайте поясницу на жиме.',
        wgerSearchTerm: 'Shoulder press'
      }
    ]
  },
  {
    id: 'glutes',
    name: 'Ягодицы — мостик',
    meta: '≈20 мин',
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
        note: 'Сжимайте ягодицы вверху, не переразгибайте поясницу.',
        wgerSearchTerm: 'Glute bridge'
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
        note: 'Лопатки на опоре, подбородок слегка прижат.',
        wgerSearchTerm: 'Hip thrust'
      }
    ]
  }
];
