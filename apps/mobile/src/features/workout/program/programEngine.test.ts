import type { DayProgress } from '@/engines/WorkoutStats';
import type { WorkoutDay } from '../catalog';
import {
  applyProgramTargets,
  daysBetweenDateKeys,
  isDeloadWeekIndex,
  isProgramFinished,
  nominalProgression,
  programTodayDayId,
  programView,
  programWeekDoneDays,
  programWeekIndex,
  progressionForWeek
} from './programEngine';

/** 2026-10-05 — понедельник (как и 2026-09-28 в тестах workoutScreenHelpers). */
const START = '2026-10-05';

function makePlan(): WorkoutDay[] {
  return ['d0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6'].map((id, i) => ({
    id,
    name: `День ${i}`,
    meta: '≈30 мин',
    exercises: [
      {
        id: 100 + i,
        index: 1,
        name: `Упражнение ${i}`,
        workingWeight: 0,
        workingReps: 10,
        totalSets: 3,
        restSeconds: 60,
        targetMuscles: ['core'],
        note: 'тест'
      }
    ]
  })) as WorkoutDay[];
}

/** Заполнить dayProgress: полные дни по порядковым датам от старта. */
function doneDays(dayProgress: DayProgress, keys: string[]): DayProgress {
  const plan = makePlan();
  const next: DayProgress = { ...dayProgress };
  for (const key of keys) {
    const d = new Date(`${key}T12:00:00`);
    const day = plan[(d.getDay() === 0 ? 6 : d.getDay() - 1) % plan.length];
    next[key] = { [day.exercises[0].id]: 3 };
  }
  return next;
}

describe('programEngine', () => {
  describe('календарь', () => {
    it('daysBetweenDateKeys считает целые дни', () => {
      expect(daysBetweenDateKeys(START, '2026-10-05')).toBe(0);
      expect(daysBetweenDateKeys(START, '2026-10-11')).toBe(6);
      expect(daysBetweenDateKeys(START, '2026-10-12')).toBe(7);
    });

    it('programWeekIndex клампится в границы программы', () => {
      const program = { lengthWeeks: 4 as const, startDateKey: START, skippedDateKeys: [] };
      expect(programWeekIndex(program, new Date('2026-10-05T12:00:00'))).toBe(0);
      expect(programWeekIndex(program, new Date('2026-10-12T12:00:00'))).toBe(1);
      expect(programWeekIndex(program, new Date('2026-11-20T12:00:00'))).toBe(3);
    });

    it('isProgramFinished: 4 недели = 28 дней', () => {
      const program = { lengthWeeks: 4 as const, startDateKey: START, skippedDateKeys: [] };
      expect(isProgramFinished(program, new Date('2026-11-01T12:00:00'))).toBe(false);
      expect(isProgramFinished(program, new Date('2026-11-02T12:00:00'))).toBe(true);
    });

    it('каждая 4-я неделя — разгрузочная', () => {
      expect(isDeloadWeekIndex(0)).toBe(false);
      expect(isDeloadWeekIndex(2)).toBe(false);
      expect(isDeloadWeekIndex(3)).toBe(true);
      expect(isDeloadWeekIndex(7)).toBe(true);
    });
  });

  describe('прогрессия', () => {
    it('+1 повтор/неделя, после 3 недель — +сет', () => {
      expect(nominalProgression(0)).toMatchObject({ repBonus: 0, setBonus: 0, isDeload: false });
      expect(nominalProgression(1)).toMatchObject({ repBonus: 1, setBonus: 0 });
      expect(nominalProgression(3)).toMatchObject({ repBonus: 0, setBonus: 0, isDeload: true });
      expect(nominalProgression(4)).toMatchObject({ repBonus: 3, setBonus: 1 });
      expect(nominalProgression(6)).toMatchObject({ repBonus: 3, setBonus: 2 });
    });

    it('applyProgramTargets поднимает повторы и подходы', () => {
      const ex = {
        id: 1,
        index: 1,
        name: 'Отжимания',
        workingWeight: 0,
        workingReps: 10,
        totalSets: 3,
        restSeconds: 60,
        targetMuscles: ['chest'],
        note: ''
      };
      const boosted = applyProgramTargets([ex], nominalProgression(4));
      expect(boosted[0].workingReps).toBe(13);
      expect(boosted[0].totalSets).toBe(4);
      // Базовая неделя возвращает те же объекты без копирования.
      expect(applyProgramTargets([ex], nominalProgression(0))[0]).toBe(ex);
    });

    it('deload-неделя снимает бонус и минусует один подход', () => {
      const ex = {
        id: 1,
        index: 1,
        name: 'Отжимания',
        workingWeight: 0,
        workingReps: 10,
        totalSets: 4,
        restSeconds: 60,
        targetMuscles: ['chest'],
        note: ''
      };
      const deload = applyProgramTargets([ex], nominalProgression(3));
      expect(deload[0].workingReps).toBe(10);
      expect(deload[0].totalSets).toBe(3);
    });

    it('авторегуляция: провальная неделя не двигает нагрузку', () => {
      const plan = makePlan();
      const program = { lengthWeeks: 4 as const, startDateKey: START, skippedDateKeys: [] };
      const now = new Date('2026-10-12T12:00:00'); // вторая неделя

      // На первой неделе выполнено 2 дня (< 4) — прогрессии нет.
      const weak = doneDays({}, ['2026-10-05', '2026-10-06']);
      expect(progressionForWeek(plan, program, weak, 1, now)).toMatchObject({
        repBonus: 0,
        setBonus: 0
      });

      // Выполнено 4+ дней — неделя 2 получает +1 повтор.
      const strong = doneDays({}, ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08']);
      expect(progressionForWeek(plan, program, strong, 1, now)).toMatchObject({
        repBonus: 1,
        setBonus: 0
      });
    });
  });

  describe('выполнение и расписание', () => {
    it('programWeekDoneDays считает только полностью выполненные дни', () => {
      const plan = makePlan();
      const program = { lengthWeeks: 4 as const, startDateKey: START, skippedDateKeys: [] };
      const dayProgress = doneDays({}, ['2026-10-05', '2026-10-06']);
      expect(programWeekDoneDays(plan, program, dayProgress, 0)).toBe(2);
    });

    it('пропущенный день не требуется выполнять и не считается выполненным', () => {
      const plan = makePlan();
      const program = {
        lengthWeeks: 4 as const,
        startDateKey: START,
        skippedDateKeys: ['2026-10-06']
      };
      const dayProgress = doneDays({}, ['2026-10-05']);
      expect(programWeekDoneDays(plan, program, dayProgress, 0)).toBe(1);
      const view = programView(plan, program, dayProgress, new Date('2026-10-06T12:00:00'));
      expect(view.weekTotal).toBe(6);
    });

    it('programTodayDayId: обычный день — по дню недели, пропущенный — следующий', () => {
      const plan = makePlan();
      const monday = new Date('2026-10-05T12:00:00');
      const activeProgram = { lengthWeeks: 4 as const, startDateKey: START, skippedDateKeys: [] };
      expect(programTodayDayId(plan, null, monday)).toBe('d0');
      expect(programTodayDayId(plan, activeProgram, monday)).toBe('d0');
      expect(
        programTodayDayId(plan, { ...activeProgram, skippedDateKeys: ['2026-10-05'] }, monday)
      ).toBe('d1');
    });

    it('programView собирает сводку недели и всей программы', () => {
      const plan = makePlan();
      const program = { lengthWeeks: 4 as const, startDateKey: START, skippedDateKeys: [] };
      const dayProgress = doneDays({}, ['2026-10-05', '2026-10-06', '2026-10-07']);
      const view = programView(plan, program, dayProgress, new Date('2026-10-07T12:00:00'));
      expect(view.weekIndex).toBe(0);
      expect(view.lengthWeeks).toBe(4);
      expect(view.weekDone).toBe(3);
      expect(view.weekTotal).toBe(7);
      expect(view.overallDone).toBe(3);
      expect(view.overallTotal).toBe(28);
      expect(view.finished).toBe(false);
    });
  });
});
