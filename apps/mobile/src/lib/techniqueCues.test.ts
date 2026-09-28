import { formatRestClock, techniqueCuesFromNote } from './techniqueCues';

describe('techniqueCuesFromNote', () => {
  it('splits sentences', () => {
    const cues = techniqueCuesFromNote(
      'Держи спину. Локти под грифом. Не отрывай пятки.'
    );
    expect(cues.length).toBe(3);
    expect(cues[0]).toContain('спину');
  });

  it('returns empty for blank', () => {
    expect(techniqueCuesFromNote('')).toEqual([]);
  });
});

describe('formatRestClock', () => {
  it('formats mm:ss', () => {
    expect(formatRestClock(90)).toBe('1:30');
    expect(formatRestClock(5)).toBe('0:05');
    expect(formatRestClock(0)).toBe('0:00');
  });
});
