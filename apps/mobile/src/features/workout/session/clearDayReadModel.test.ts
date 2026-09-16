import { useFitPulseStore } from '@/state/useFitPulseStore';
import { clearDayReadModel } from './clearDayReadModel';

describe('clearDayReadModel', () => {
  beforeEach(() => {
    useFitPulseStore.setState({
      setLogs: [
        { id: 'a', exerciseId: 1, dateKey: '2026-09-17', weight: 80, reps: 8, rir: 1 },
        { id: 'b', exerciseId: 2, dateKey: '2026-09-16', weight: 100, reps: 5, rir: 2 }
      ],
      dayProgress: {
        '2026-09-17': { 1: 2 },
        '2026-09-16': { 2: 1 }
      }
    });
  });

  it('removes only the target dateKey rows', () => {
    clearDayReadModel('2026-09-17');
    const s = useFitPulseStore.getState();
    expect(s.setLogs).toHaveLength(1);
    expect(s.setLogs[0]?.dateKey).toBe('2026-09-16');
    expect(s.dayProgress['2026-09-17']).toBeUndefined();
    expect(s.dayProgress['2026-09-16']?.[2]).toBe(1);
  });
});
