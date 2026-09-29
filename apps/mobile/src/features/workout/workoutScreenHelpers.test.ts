import { todayPlanDayId } from './workoutScreenHelpers';
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
