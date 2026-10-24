import { groupLoads, loadStatusForSets, muscleLoadGroup } from './muscleLoadGroups';

describe('muscleLoadGroups', () => {
  it('maps domain and dataset muscle keys to map groups', () => {
    expect(muscleLoadGroup('chest')).toBe('chest');
    expect(muscleLoadGroup('core')).toBe('abdominals');
    expect(muscleLoadGroup('quads')).toBe('quadriceps');
    expect(muscleLoadGroup('lowerback')).toBe('back');
    expect(muscleLoadGroup('back')).toBe('back');
    expect(muscleLoadGroup('lats')).toBe('back');
    expect(muscleLoadGroup('neck')).toBe(null);
  });

  it('aggregates sets per group and recomputes the status', () => {
    const groups = groupLoads([
      { muscle: 'back', weeklySets: 12, status: 'optimal' },
      { muscle: 'lowerback', weeklySets: 4, status: 'under' },
      { muscle: 'chest', weeklySets: 22, status: 'junk' },
      { muscle: 'neck', weeklySets: 99, status: 'junk' }
    ]);
    expect(groups).toEqual([
      { group: 'chest', weeklySets: 22, status: 'junk' },
      { group: 'back', weeklySets: 16, status: 'optimal' }
    ]);
  });

  it('classifies by the default MEV/MRV thresholds', () => {
    expect(loadStatusForSets(0)).toBe("under");
    expect(loadStatusForSets(10)).toBe("optimal");
    expect(loadStatusForSets(20)).toBe("optimal");
    expect(loadStatusForSets(20.5)).toBe("junk");
  });
});
