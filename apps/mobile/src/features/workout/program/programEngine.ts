import type { DayProgress } from '@/engines/WorkoutStats';
import { toDateKey } from '@/engines/WorkoutStats';
import type { ExerciseDef } from '../ExerciseSheet';
import type { WorkoutDay } from '../catalog';
import { isDayPlanComplete, todayPlanDayId } from '../workoutScreenHelpers';

/**
 * Движок многонедельных программ (Фаза 3, issue #158): расписание по дням
 * недели, прогрессия «+1 повтор/неделя → затем +сет», разгрузочная
 * (deload) неделя и авторегуляция по факту выполнения.
 * Чистые функции: без React, без хранения, без Date.now() внутри.
 */

export type ProgramLengthWeeks = 4 | 6 | 8;

export const PROGRAM_LENGTHS: readonly ProgramLengthWeeks[] = [4, 6, 8];

export interface ProgramState {
  lengthWeeks: ProgramLengthWeeks;
  /** dateKey (YYYY-MM-DD) первого дня программы. */
  startDateKey: string;
  /** Дни, которые пользователь явно пропустил («перенести день»). */
  skippedDateKeys: string[];
}

export interface WeekProgression {
  /** 0-based индекс недели внутри программы. */
  weekIndex: number;
  /** +повторы к базовому плану (0–3). */
  repBonus: number;
  /** +подходы к базовому плану (0–2). */
  setBonus: number;
  /** Разгрузочная неделя: без бонусов и минус один подход. */
  isDeload: boolean;
}

export interface ProgramView {
  weekIndex: number;
  lengthWeeks: ProgramLengthWeeks;
  progression: WeekProgression;
  finished: boolean;
  /** Выполнено дней на текущей неделе (по факту). */
  weekDone: number;
  /** Запланировано дней на текущей неделе (без пропущенных). */
  weekTotal: number;
  /** Выполнено дней за всю программу. */
  overallDone: number;
  /** Всего дней в программе. */
  overallTotal: number;
}

const MAX_REP_BONUS = 3;
const MAX_SET_BONUS = 2;
const REPS_HARD_CAP = 50;
const SETS_HARD_CAP = 8;
/** Авторегуляция: сколько дней прошлой недели нужно выполнить, чтобы нагрузка росла. */
const AUTOREG_MIN_WEEK_DAYS = 4;

function parseDateKey(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00`);
}

function isDateSkipped(program: ProgramState, dateKey: string): boolean {
  return program.skippedDateKeys.includes(dateKey);
}

/** Целых дней между двумя dateKey (to − from). */
export function daysBetweenDateKeys(fromKey: string, toKey: string): number {
  const ms = parseDateKey(toKey).getTime() - parseDateKey(fromKey).getTime();
  return Math.floor(ms / 86400000);
}

/** 0-based неделя программы для указанной даты (клампится в диапазон). */
export function programWeekIndex(program: ProgramState, now: Date = new Date()): number {
  const days = daysBetweenDateKeys(program.startDateKey, toDateKey(now));
  if (days <= 0) return 0;
  return Math.min(program.lengthWeeks - 1, Math.floor(days / 7));
}

export function isProgramFinished(program: ProgramState, now: Date = new Date()): boolean {
  return daysBetweenDateKeys(program.startDateKey, toDateKey(now)) >= program.lengthWeeks * 7;
}

/** Каждая 4-я неделя программы — разгрузочная. */
export function isDeloadWeekIndex(weekIndex: number): boolean {
  return (weekIndex + 1) % 4 === 0;
}

/** День плана, приходящийся на указанную дату (понедельник → index 0). */
export function planForDate(plan: WorkoutDay[], date: Date): WorkoutDay | null {
  const id = todayPlanDayId(plan, date);
  return plan.find((d) => d.id === id) ?? null;
}

/** Номинальная прогрессия недели — без авторегуляционной поправки. */
export function nominalProgression(weekIndex: number): WeekProgression {
  if (isDeloadWeekIndex(weekIndex)) {
    return { weekIndex, repBonus: 0, setBonus: 0, isDeload: true };
  }
  return {
    weekIndex,
    repBonus: Math.min(weekIndex, MAX_REP_BONUS),
    setBonus: Math.min(Math.max(weekIndex - MAX_REP_BONUS, 0), MAX_SET_BONUS),
    isDeload: false
  };
}

/** Применить прогрессию недели к упражнениям дня (чистый map). */
export function applyProgramTargets(
  exercises: ExerciseDef[],
  progression: WeekProgression
): ExerciseDef[] {
  if (progression.isDeload) {
    return exercises.map((ex) => ({ ...ex, totalSets: Math.max(1, ex.totalSets - 1) }));
  }
  if (progression.repBonus === 0 && progression.setBonus === 0) {
    return exercises;
  }
  return exercises.map((ex) => ({
    ...ex,
    workingReps: Math.min(REPS_HARD_CAP, ex.workingReps + progression.repBonus),
    totalSets: Math.min(SETS_HARD_CAP, ex.totalSets + progression.setBonus)
  }));
}

/** Сколько дней недели weekIndex выполнено по факту (из dayProgress). */
export function programWeekDoneDays(
  plan: WorkoutDay[],
  program: ProgramState,
  dayProgress: DayProgress,
  weekIndex: number,
  now: Date = new Date()
): number {
  const progression = nominalProgression(weekIndex);
  const weekStart = parseDateKey(program.startDateKey);
  weekStart.setDate(weekStart.getDate() + weekIndex * 7);
  const todayKey = toDateKey(now);

  let done = 0;
  for (let i = 0; i < 7; i += 1) {
    const day = new Date(weekStart);
    day.setDate(day.getDate() + i);
    const key = toDateKey(day);
    if (key > todayKey) break;
    if (isDateSkipped(program, key)) continue;
    const planDay = planForDate(plan, day);
    if (!planDay) continue;
    const exercises = applyProgramTargets(planDay.exercises, progression);
    if (isDayPlanComplete(dayProgress, key, exercises)) done += 1;
  }
  return done;
}

/**
 * Прогрессия недели с авторегуляцией: если на прошлой неделе выполнено
 * меньше AUTOREG_MIN_WEEK_DAYS дней, нагрузка не растёт (бонусы −1).
 */
export function progressionForWeek(
  plan: WorkoutDay[],
  program: ProgramState,
  dayProgress: DayProgress,
  weekIndex: number,
  now: Date = new Date()
): WeekProgression {
  const nominal = nominalProgression(weekIndex);
  if (nominal.isDeload || weekIndex === 0) return nominal;
  const prevDone = programWeekDoneDays(plan, program, dayProgress, weekIndex - 1, now);
  if (prevDone >= AUTOREG_MIN_WEEK_DAYS) return nominal;
  return {
    ...nominal,
    repBonus: Math.max(0, nominal.repBonus - 1),
    setBonus: Math.max(0, nominal.setBonus - 1)
  };
}

function countSkippedInWeek(program: ProgramState, weekIndex: number): number {
  const weekStart = parseDateKey(program.startDateKey);
  weekStart.setDate(weekStart.getDate() + weekIndex * 7);
  let count = 0;
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    if (isDateSkipped(program, toDateKey(d))) count += 1;
  }
  return count;
}

/** Итоговая сводка программы для UI («Неделя 2/4», выполнено дней и т.д.). */
export function programView(
  plan: WorkoutDay[],
  program: ProgramState,
  dayProgress: DayProgress,
  now: Date = new Date()
): ProgramView {
  const weekIndex = programWeekIndex(program, now);
  const progression = progressionForWeek(plan, program, dayProgress, weekIndex, now);

  let overallDone = 0;
  for (let w = 0; w < program.lengthWeeks; w += 1) {
    overallDone += programWeekDoneDays(plan, program, dayProgress, w, now);
  }

  return {
    weekIndex,
    lengthWeeks: program.lengthWeeks,
    progression,
    finished: isProgramFinished(program, now),
    weekDone: programWeekDoneDays(plan, program, dayProgress, weekIndex, now),
    weekTotal: 7 - countSkippedInWeek(program, weekIndex),
    overallDone,
    overallTotal: program.lengthWeeks * 7
  };
}

/**
 * День плана «на сегодня» с учётом пропусков: если сегодняшний день
 * пропущен, предлагаем следующий день программы («перенести день»).
 */
export function programTodayDayId(
  plan: WorkoutDay[],
  program: ProgramState | null,
  now: Date = new Date()
): string {
  const base = todayPlanDayId(plan, now);
  if (!program || plan.length === 0) return base;
  if (!isDateSkipped(program, toDateKey(now))) return base;
  const js = now.getDay();
  const monBased = (js === 0 ? 6 : js - 1) + 1;
  return plan[monBased % plan.length]?.id ?? base;
}
