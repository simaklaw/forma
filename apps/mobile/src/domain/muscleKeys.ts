export type MuscleKey =
  | 'chest'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'core'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'lowerback'
  | 'back'
  | 'calves';

export const MUSCLE_LABELS: Record<MuscleKey, string> = {
  chest: 'грудь',
  shoulders: 'плечи',
  biceps: 'бицепс',
  triceps: 'трицепс',
  core: 'кор',
  quads: 'квадрицепс',
  hamstrings: 'бицепс бедра',
  glutes: 'ягодицы',
  lowerback: 'поясница',
  back: 'спина',
  calves: 'икры'
};
