/**
 * Связка групп интерактивной карты мышц с датасет-мышцами yuhonas/free-exercise-db
 * (primaryMuscles/secondaryMuscles). Порт групп из Snouzy/workout-cool (MIT).
 * adductors / abductors / neck на карте не представлены — их находят поиском.
 */
import type { Language } from '@/i18n/useLanguageStore';

export type MusclePickerGroupKey =
  | 'biceps'
  | 'forearms'
  | 'chest'
  | 'triceps'
  | 'abdominals'
  | 'obliques'
  | 'quadriceps'
  | 'shoulders'
  | 'calves'
  | 'traps'
  | 'back'
  | 'hamstrings'
  | 'glutes';

export const MUSCLE_GROUP_MUSCLES: Record<MusclePickerGroupKey, string[]> = {
  biceps: ['biceps'],
  forearms: ['forearms'],
  chest: ['chest'],
  triceps: ['triceps'],
  abdominals: ['abdominals'],
  obliques: ['abdominals'],
  quadriceps: ['quadriceps'],
  shoulders: ['shoulders'],
  calves: ['calves'],
  traps: ['traps'],
  back: ['middle back', 'lats', 'lower back'],
  hamstrings: ['hamstrings'],
  glutes: ['glutes']
};

const LABELS_RU: Record<MusclePickerGroupKey, string> = {
  biceps: 'Бицепс',
  forearms: 'Предплечья',
  chest: 'Грудь',
  triceps: 'Трицепс',
  abdominals: 'Пресс',
  obliques: 'Косые мышцы',
  quadriceps: 'Квадрицепсы',
  shoulders: 'Плечи',
  calves: 'Икры',
  traps: 'Трапеции',
  back: 'Спина',
  hamstrings: 'Бицепс бедра',
  glutes: 'Ягодицы'
};

const LABELS_EN: Record<MusclePickerGroupKey, string> = {
  biceps: 'Biceps',
  forearms: 'Forearms',
  chest: 'Chest',
  triceps: 'Triceps',
  abdominals: 'Abs',
  obliques: 'Obliques',
  quadriceps: 'Quadriceps',
  shoulders: 'Shoulders',
  calves: 'Calves',
  traps: 'Traps',
  back: 'Back',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes'
};

export function muscleGroupLabel(key: MusclePickerGroupKey, lang: Language): string {
  return lang === 'en' ? LABELS_EN[key] : LABELS_RU[key];
}

/** Уникальные датасет-мышцы для выбранных групп карты. */
export function datasetMusclesForGroups(groups: readonly MusclePickerGroupKey[]): string[] {
  const out: string[] = [];
  for (const group of groups) {
    for (const muscle of MUSCLE_GROUP_MUSCLES[group]) {
      if (!out.includes(muscle)) out.push(muscle);
    }
  }
  return out;
}
