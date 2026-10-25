/**
 * Чистая логика keep-awake экрана тренировки: решение «держать ли экран
 * бодрствующим». Обвязка с expo-keep-awake (activate/deactivate) живёт в
 * WorkoutScreen, чтобы логику можно было покрывать юнит-тестами без нативных
 * модулей.
 */

/** Тег wake-lock: активация и деактивация работают строго в паре. */
export const KEEP_AWAKE_TAG = 'fitpulse-workout-session';

export interface KeepAwakeState {
  /** День активной сессии (dayIdFromTemplate(session)) или null, если сессии нет. */
  sessionDayId: string | null;
  /** День, который пользователь просматривает на экране тренировки. */
  activeDayId: string | null | undefined;
}

/**
 * Экран не гаснет, только пока идёт сессия просматриваемого дня.
 * Пользователь листает чипы других дней, сессии нет или день не совпал —
 * засыпаем по системным настройкам и не тратим батарею.
 */
export function shouldKeepScreenAwake({ sessionDayId, activeDayId }: KeepAwakeState): boolean {
  if (sessionDayId == null || sessionDayId === '') return false;
  return sessionDayId === activeDayId;
}
