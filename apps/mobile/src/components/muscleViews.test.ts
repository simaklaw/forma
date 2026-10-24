import type { MuscleKey } from '@/domain/muscleKeys';
import { splitMusclesByView } from './muscleViews';

describe('splitMusclesByView', () => {
  it('assigns anterior muscles to the front view only', () => {
    const views = splitMusclesByView(['chest', 'biceps', 'core', 'quads']);
    expect(views.front).toEqual(['chest', 'biceps', 'core', 'quads']);
    expect(views.back).toEqual([]);
  });

  it('assigns posterior muscles to the back view only', () => {
    const views = splitMusclesByView(['glutes', 'hamstrings', 'lowerback', 'calves', 'triceps', 'back']);
    expect(views.front).toEqual([]);
    expect(views.back).toEqual(['glutes', 'hamstrings', 'lowerback', 'calves', 'triceps', 'back']);
  });

  it('shows shoulders on both views and keeps the input order', () => {
    const views = splitMusclesByView(['shoulders', 'back', 'core']);
    expect(views.front).toEqual(['shoulders', 'core']);
    expect(views.back).toEqual(['shoulders', 'back']);
  });

  it('falls back to the front view for keys without map positions', () => {
    const unknown = 'forearms' as MuscleKey;
    const views = splitMusclesByView([unknown]);
    expect(views.front).toEqual([unknown]);
    expect(views.back).toEqual([]);
  });
});
