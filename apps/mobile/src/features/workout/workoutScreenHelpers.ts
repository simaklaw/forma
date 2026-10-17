import type { DayProgress } from '@/engines/WorkoutStats';
import { lastNDays, toDateKey } from '@/engines/WorkoutStats';
import type { WorkoutDay } from './catalog';

export const WEEKDAY_RU_FULL = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];

/** Home-only for now; set true to show gym/home toggle. */
export const SHOW_GYM_MODE_TOGGLE = false;

/**
 * Pick today's day in the weekly cycle from the plan list.
 * Monday → index 0 … Sunday → index 6 (mod plan length).
 */
export function todayPlanDayId(plan: WorkoutDay[], now: Date = new Date()): string {
  if (plan.length === 0) return '';
  const js = now.getDay(); // 0 = Sunday
  const monBased = js === 0 ? 6 : js - 1;
  return plan[monBased % plan.length]!.id;
}

export function isDayPlanComplete(
  dayProgress: DayProgress,
  dateKey: string,
  exercises: { id: number; totalSets: number }[]
): boolean {
  const progress = dayProgress[dateKey];
  if (!progress) return false;
  return exercises.every((ex) => (progress[ex.id] ?? 0) >= ex.totalSets);
}

export function isAnyPlanComplete(plan: WorkoutDay[], dayProgress: DayProgress, dateKey: string): boolean {
  return plan.some((day) => isDayPlanComplete(dayProgress, dateKey, day.exercises));
}

export function selectPlanWeekDaysCompleted(
  plan: WorkoutDay[],
  dayProgress: DayProgress,
  days = 7,
  now: Date = new Date()
): number {
  return lastNDays(days, now).filter((d) => isAnyPlanComplete(plan, dayProgress, toDateKey(d))).length;
}

export function selectPlanCurrentStreak(
  plan: WorkoutDay[],
  dayProgress: DayProgress,
  now: Date = new Date()
): number {
  const cursor = new Date(now);
  if (!isAnyPlanComplete(plan, dayProgress, toDateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  let streak = 0;
  while (isAnyPlanComplete(plan, dayProgress, toDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export type DayStatus = 'done' | 'today-in-progress' | 'missed';

export function selectPlanStreakDays(
  plan: WorkoutDay[],
  dayProgress: DayProgress,
  days = 7,
  now: Date = new Date()
): DayStatus[] {
  const window = lastNDays(days, now);
  const todayKey = toDateKey(now);
  return window.map((d) => {
    const key = toDateKey(d);
    if (isAnyPlanComplete(plan, dayProgress, key)) return 'done';
    return key === todayKey ? 'today-in-progress' : 'missed';
  });
}

/**
 * Short day-chip caption: the head before the dash, or the first word when the
 * head is long. Android ignores adjustsFontSizeToFit, so the caption must be
 * short by construction (issue #171: empty day chips on the device).
 */
export function dayChipLabel(name: string): string {
  const head = name.split(/\s+[-—–]\s+/)[0]?.trim() || name;
  if (head.length <= 9) return head;
  const firstWord = head.split(' ')[0] ?? head;
  return firstWord.length >= 3 ? firstWord : head.slice(0, 9);
}

/**
 * Neutral initials placeholder for exercises without mediaKey (issue #171:
 * replaces the black square in the day list).
 */
export function exerciseInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '—';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}
