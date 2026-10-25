import { useStreakFreezeStore } from './useStreakFreezeStore';

describe('useStreakFreezeStore (заморозка серии)', () => {
  beforeEach(() => {
    useStreakFreezeStore.setState({ frozenDates: [] });
  });

  test('applyReconciled сохраняет новый список замороженных дней', () => {
    useStreakFreezeStore.getState().applyReconciled(['2026-10-01', '2026-10-02']);
    expect(useStreakFreezeStore.getState().frozenDates).toEqual(['2026-10-01', '2026-10-02']);
  });

  test('applyReconciled — no-op при том же содержимом', () => {
    useStreakFreezeStore.getState().applyReconciled(['2026-10-01']);
    const before = useStreakFreezeStore.getState();
    useStreakFreezeStore.getState().applyReconciled(['2026-10-01']);
    expect(useStreakFreezeStore.getState()).toBe(before);
  });
});
