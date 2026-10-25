import { toDateKey } from '@forma/core';
import {
  FREEZES_PER_MONTH,
  MAX_FREEZE_LOOKBACK_DAYS,
  freezesLeftInMonth,
  monthKeyOfDateKey,
  normalizeFrozenDates,
  reconcileStreakFreeze
} from './streakFreeze';

const NOW = new Date(2026, 9, 15); // 15 окт 2026

function daysAgoKey(n: number): string {
  const d = new Date(NOW);
  d.setDate(d.getDate() - n);
  return toDateKey(d);
}

describe('streakFreeze (заморозка серии)', () => {
  test('лимит — 2 заморозки в месяц, глубина прохода — 7 дней', () => {
    expect(FREEZES_PER_MONTH).toBe(2);
    expect(MAX_FREEZE_LOOKBACK_DAYS).toBe(7);
  });

  test('monthKeyOfDateKey вырезает YYYY-MM', () => {
    expect(monthKeyOfDateKey('2026-10-15')).toBe('2026-10');
  });

  test('freezesLeftInMonth: свежий месяц полон, чужие месяцы не мешают', () => {
    expect(freezesLeftInMonth([], '2026-10-15')).toBe(2);
    expect(freezesLeftInMonth(['2026-10-01', '2026-10-02'], '2026-10-15')).toBe(0);
    expect(freezesLeftInMonth(['2026-09-30', '2026-09-29'], '2026-10-15')).toBe(2);
  });

  test('normalizeFrozenDates: чистит мусор и дубли, сортирует, капит 200', () => {
    expect(normalizeFrozenDates('junk')).toEqual([]);
    expect(normalizeFrozenDates(null)).toEqual([]);
    expect(normalizeFrozenDates(['2026-10-02', 'b', '2026-10-01', '2026-10-02', 5])).toEqual([
      '2026-10-01',
      '2026-10-02'
    ]);
    const many: string[] = [];
    for (let i = 0; i < 205; i += 1) {
      const y = 2000 + Math.floor(i / 60);
      const m = String((Math.floor(i / 5) % 12) + 1).padStart(2, '0');
      const d = String((i % 5) + 1).padStart(2, '0');
      many.push(y + '-' + m + '-' + d);
    }
    expect(normalizeFrozenDates(many)).toHaveLength(200);
  });

  test('реконсиляция ничего не тратит, если вчера был активен', () => {
    const result = reconcileStreakFreeze([], (key) => key === daysAgoKey(1), NOW);
    expect(result).toEqual([]);
  });

  test('пустой вчера съедает одну заморозку', () => {
    const active = new Set([daysAgoKey(2)]);
    const result = reconcileStreakFreeze([], (key) => active.has(key), NOW);
    expect(result).toEqual([daysAgoKey(1)]);
  });

  test('лимит месяца: из четырёх пустых дней морозятся только два', () => {
    const result = reconcileStreakFreeze([], () => false, NOW);
    expect(result).toEqual([daysAgoKey(1), daysAgoKey(2)]);
  });

  test('замороженный ранее день прозрачен для прохода', () => {
    const active = new Set([daysAgoKey(4)]);
    const result = reconcileStreakFreeze([daysAgoKey(1)], (key) => active.has(key), NOW);
    expect(result).toEqual([daysAgoKey(1), daysAgoKey(2), daysAgoKey(3)]);
  });

  test('идемпотентность: повторный проход ничего не добавляет', () => {
    const once = reconcileStreakFreeze([], () => false, NOW);
    const twice = reconcileStreakFreeze(once, () => false, NOW);
    expect(twice).toEqual(once);
  });

  test('гэп через границу месяца тратит лимиты обоих месяцев', () => {
    const feb2 = new Date(2026, 1, 2);
    const result = reconcileStreakFreeze([], () => false, feb2);
    expect(result).toEqual(['2026-01-30', '2026-01-31', '2026-02-01']);
  });
});
