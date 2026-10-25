/**
 * voiceCueEvents.ts
 *
 * Гранулярные настройки озвучки тренировки: пользователь выбирает, какие
 * события проговариваются вслух (начало упражнения, подход записан,
 * отсчёт отдыха, конец отдыха, конец тренировки), а не один общий тумблер.
 * Концепт — идея «напоминания об отдыхе / следующем подходе» из разбора
 * Home Workouts Pro (проприетарное приложение, только clean-room идея,
 * без кода); реализация оригинальная.
 */

/** Идентификаторы озвучиваемых событий тренировки. */
export type VoiceCueEvent =
  | 'exerciseStart'
  | 'setComplete'
  | 'restCountdown'
  | 'restOver'
  | 'dayComplete';

/** Порядок событий в карточке настроек профиля. */
export const VOICE_CUE_EVENTS: VoiceCueEvent[] = [
  'exerciseStart',
  'setComplete',
  'restCountdown',
  'restOver',
  'dayComplete'
];

/** Включено всё — поведение до появления гранулярных настроек. */
export const DEFAULT_VOICE_CUE_FLAGS: Record<VoiceCueEvent, boolean> = {
  exerciseStart: true,
  setComplete: true,
  restCountdown: true,
  restOver: true,
  dayComplete: true
};

/**
 * Приводит сохранённые флаги к полному набору: пропущенные и не-boolean
 * значения берутся из дефолтов, незнакомые ключи игнорируются. Чистая
 * функция — используется в merge persist-стора при чтении старых снапшотов.
 */
export function normalizeVoiceCueFlags(input: unknown): Record<VoiceCueEvent, boolean> {
  const source =
    typeof input === 'object' && input !== null ? (input as Record<string, unknown>) : {};
  const result = { ...DEFAULT_VOICE_CUE_FLAGS };
  for (const event of VOICE_CUE_EVENTS) {
    const value = source[event];
    if (typeof value === 'boolean') result[event] = value;
  }
  return result;
}
