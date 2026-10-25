/**
 * Чистые помощники UI таймера отдыха: фазы «светофора» и превью
 * следующего шага.
 *
 * Clean-room концепции из обзора workout_buddy (учебный проект Code
 * Institute; репозиторий без лицензии — заимствованы только идеи
 * цветовых фаз отсчёта и превью следующего упражнения на экране
 * отдыха). Пороги, типы и реализация собственные.
 */

export type RestTimerPhase = 'plenty' | 'soon' | 'final';

/** Доля оставшегося времени, ниже которой фаза жёлтая. */
export const REST_PHASE_SOON_FRACTION = 0.5;
/** Доля оставшегося времени, ниже которой фаза красная. */
export const REST_PHASE_FINAL_FRACTION = 0.2;

/**
 * Фаза светофора по оставшимся секундам. Пороги пропорциональные, не
 * фиксированные: у отдыха 60 с жёлтая фаза начнётся с 30-й секунды,
 * красная — с 12-й; у короткого 20 с — с 10-й и 4-й. Defensive:
 * некорректные входы дают финальную фазу.
 */
export function restTimerPhase(remaining: number, total: number): RestTimerPhase {
  if (!Number.isFinite(remaining) || !Number.isFinite(total) || total <= 0) {
    return 'final';
  }
  if (remaining <= 0) {
    return 'final';
  }
  const fraction = Math.min(1, remaining / total);
  if (fraction > REST_PHASE_SOON_FRACTION) return 'plenty';
  if (fraction > REST_PHASE_FINAL_FRACTION) return 'soon';
  return 'final';
}

/** Что ждёт пользователя после отдыха. */
export type RestNextStep =
  | { kind: 'set'; setNumber: number; totalSets: number }
  | { kind: 'exercise'; name: string; sets: number; amount: string };

/**
 * Превью следующего шага для экрана отдыха: пока у текущего упражнения
 * остались подходы — следующий подход («Дальше: подход 2/3»); когда
 * подходы исчерпаны — следующее упражнение дня с количеством
 * («Дальше: Планка · 3×40с»; amount форматирует вызывающий по мере).
 * null — исчерпаны и подходы, и список дня.
 */
export function nextRestStep(
  completedSets: number,
  totalSets: number,
  next: { name: string; sets: number; amount: string } | null
): RestNextStep | null {
  if (Number.isFinite(totalSets) && totalSets > 0 && completedSets < totalSets) {
    return {
      kind: 'set',
      setNumber: Math.max(1, completedSets + 1),
      totalSets
    };
  }
  if (next && next.name && Number.isFinite(next.sets) && next.sets > 0) {
    return { kind: 'exercise', name: next.name, sets: next.sets, amount: next.amount };
  }
  return null;
}
