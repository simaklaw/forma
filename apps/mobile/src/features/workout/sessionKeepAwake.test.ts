import { KEEP_AWAKE_TAG, shouldKeepScreenAwake } from './sessionKeepAwake';

describe('shouldKeepScreenAwake', () => {
  it('тег wake-lock фиксирован: активация и деактивация должны быть парой', () => {
    expect(KEEP_AWAKE_TAG).toBe('fitpulse-workout-session');
  });

  it('без активной сессии экран засыпает по системным настройкам', () => {
    expect(shouldKeepScreenAwake({ sessionDayId: null, activeDayId: 'day-a' })).toBe(false);
  });

  it('сессия просматриваемого дня держит экран бодрствующим', () => {
    expect(shouldKeepScreenAwake({ sessionDayId: 'day-a', activeDayId: 'day-a' })).toBe(true);
  });

  it('просмотр другого дня не мешает экрану засыпать', () => {
    expect(shouldKeepScreenAwake({ sessionDayId: 'day-a', activeDayId: 'day-b' })).toBe(false);
  });

  it('некорректные входы — wake-lock не держим', () => {
    expect(shouldKeepScreenAwake({ sessionDayId: '', activeDayId: '' })).toBe(false);
    expect(shouldKeepScreenAwake({ sessionDayId: 'day-a', activeDayId: undefined })).toBe(false);
    expect(shouldKeepScreenAwake({ sessionDayId: 'day-a', activeDayId: null })).toBe(false);
  });
});
