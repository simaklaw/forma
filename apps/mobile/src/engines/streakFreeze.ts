/**
 * streakFreeze.ts
 *
 * Заморозка серии (streak freeze): полностью пустой день может «съесть»
 * одну заморозку и не разорвать серию активности. Заморозки тратятся
 * автоматически при реконсиляции (эффект в App.tsx): идём от вчера назад
 * и морозим пустые дни, пока не упрёмся в активный день или лимит месяца.
 * Концепт — из разбора Fitstars (проприетарное приложение, только clean-room
 * идея, без кода); реализация оригинальная.
 */
import { toDateKey } from '@forma/core';

/** Сколько заморозок доступно в каждом календарном месяце. */
export const FREEZES_PER_MONTH = 2;

/** Насколько глубоко от вчера авто-реконсиляция может замораживать дни. */
export const MAX_FREEZE_LOOKBACK_DAYS = 7;

/** 'YYYY-MM' из dateKey — месяц, по которому считается лимит заморозок. */
export function monthKeyOfDateKey(dateKey: string): string {
  return dateKey.slice(0, 7);
}

/** Сколько заморозок ещё не потрачено в месяце, которому принадлежит dateKey. */
export function freezesLeftInMonth(
  frozenDates: readonly string[],
  dateKey: string,
  limit: number = FREEZES_PER_MONTH
): number {
  const month = monthKeyOfDateKey(dateKey);
  const used = frozenDates.filter((d) => monthKeyOfDateKey(d) === month).length;
  return Math.max(0, limit - used);
}

/**
 * Приводит сохранённые данные к валидному виду: только строки-даты формата
 * YYYY-MM-DD, без дублей, по возрастанию, не больше 200 записей (~8 лет по
 * лимиту в месяц). Чистая функция для merge persist-стора.
 */
export function normalizeFrozenDates(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const valid = input.filter(
    (d): d is string => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)
  );
  return [...new Set(valid)].sort().slice(0, 200);
}

/**
 * Реконсиляция серии: проход от вчера назад по дням. Активный день
 * останавливает проход (серия и так цела), уже замороженный день прозрачен,
 * а пустой день расходует заморозку, если у его месяца остался лимит.
 * Идемпотентна: без новых заморозок возвращает копию входного списка.
 */
export function reconcileStreakFreeze(
  frozenDates: readonly string[],
  isActiveDay: (dateKey: string) => boolean,
  now: Date = new Date()
): string[] {
  const frozen = new Set(frozenDates);
  let added = false;
  const cursor = new Date(now);
  cursor.setDate(cursor.getDate() - 1); // сегодня ещё не закончился — не морозим
  for (let step = 0; step < MAX_FREEZE_LOOKBACK_DAYS; step += 1) {
    const key = toDateKey(cursor);
    if (isActiveDay(key)) break;
    if (!frozen.has(key)) {
      if (freezesLeftInMonth([...frozen], key) <= 0) break;
      frozen.add(key);
      added = true;
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  if (!added) return frozenDates.slice();
  return [...frozen].sort();
}
