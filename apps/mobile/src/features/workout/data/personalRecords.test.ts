import { mergePersonalRecords, personalRecordsFromSetLogs } from './personalRecords';

describe('personalRecordsFromSetLogs', () => {
  it('takes max weight per exercise', () => {
    const pr = personalRecordsFromSetLogs([
      { id: 'a', exerciseId: 1, dateKey: '2026-09-17', weight: 80, reps: 8, rir: 1 },
      { id: 'b', exerciseId: 1, dateKey: '2026-09-17', weight: 90, reps: 5, rir: 2 },
      { id: 'c', exerciseId: 2, dateKey: '2026-09-17', weight: 100, reps: 5, rir: 1 }
    ]);
    expect(pr[1]).toBe(90);
    expect(pr[2]).toBe(100);
  });
});

describe('mergePersonalRecords', () => {
  it('keeps higher of both maps', () => {
    expect(mergePersonalRecords({ 1: 80 }, { 1: 70, 2: 100 })).toEqual({ 1: 80, 2: 100 });
  });
});
