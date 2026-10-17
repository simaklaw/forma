import { dayChipLabel, exerciseInitials, todayPlanDayId } from './workoutScreenHelpers';
import type { WorkoutDay } from './catalog';

const plan = [
  { id: 'a', name: 'A', meta: '', exercises: [] },
  { id: 'b', name: 'B', meta: '', exercises: [] },
  { id: 'c', name: 'C', meta: '', exercises: [] },
  { id: 'd', name: 'D', meta: '', exercises: [] },
  { id: 'e', name: 'E', meta: '', exercises: [] },
  { id: 'f', name: 'F', meta: '', exercises: [] },
  { id: 'g', name: 'G', meta: '', exercises: [] },
] as WorkoutDay[];

describe('todayPlanDayId', () => {
  it('maps Monday to first plan day', () => {
    // 2026-09-28 is Monday
    expect(todayPlanDayId(plan, new Date('2026-09-28T12:00:00'))).toBe('a');
  });

  it('maps Sunday to seventh plan day', () => {
    // 2026-09-27 is Sunday
    expect(todayPlanDayId(plan, new Date('2026-09-27T12:00:00'))).toBe('g');
  });

  it('returns empty for empty plan', () => {
    expect(todayPlanDayId([])).toBe('');
  });
});

describe('dayChipLabel', () => {
  it('takes the head before the dash', () => {
    expect(dayChipLabel('Жим — грудь, плечи, трицепс')).toBe('Жим');
  });

  it('keeps short heads as is', () => {
    expect(dayChipLabel('Всё тело — full body')).toBe('Всё тело');
  });

  it('falls back to the first word for long heads', () => {
    expect(dayChipLabel('Ноги и ягодицы — сила')).toBe('Ноги');
  });

  it('returns the raw name when there is nothing to trim', () => {
    expect(dayChipLabel('Ноги')).toBe('Ноги');
  });
});

describe('exerciseInitials', () => {
  it('builds two-letter initials from the first two words', () => {
    expect(exerciseInitials('Жим штанги лёжа')).toBe('ЖШ');
  });

  it('takes two letters of a single word', () => {
    expect(exerciseInitials('Приседания')).toBe('ПР');
  });

  it('returns a dash for empty names', () => {
    expect(exerciseInitials('   ')).toBe('—');
  });
});
