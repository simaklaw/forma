import {
  REST_PHASE_FINAL_FRACTION,
  REST_PHASE_SOON_FRACTION,
  nextRestStep,
  restTimerPhase
} from './restTimerPhase';

describe('restTimerPhase', () => {
  it('пороги: жёлтая ниже 50%, красная ниже 20%', () => {
    expect(REST_PHASE_SOON_FRACTION).toBe(0.5);
    expect(REST_PHASE_FINAL_FRACTION).toBe(0.2);
  });

  it('зелёная, пока осталось больше половины', () => {
    expect(restTimerPhase(60, 60)).toBe('plenty');
    expect(restTimerPhase(31, 60)).toBe('plenty');
  });

  it('жёлтая между 20% и 50% остатка', () => {
    expect(restTimerPhase(30, 60)).toBe('soon');
    expect(restTimerPhase(13, 60)).toBe('soon');
  });

  it('красная на последних 20% и некорректных входах', () => {
    expect(restTimerPhase(12, 60)).toBe('final');
    expect(restTimerPhase(1, 60)).toBe('final');
    expect(restTimerPhase(0, 60)).toBe('final');
    expect(restTimerPhase(30, 0)).toBe('final');
    expect(restTimerPhase(Number.NaN, 60)).toBe('final');
  });

  it('пропорциональные пороги у короткого отдыха', () => {
    expect(restTimerPhase(11, 20)).toBe('plenty');
    expect(restTimerPhase(10, 20)).toBe('soon');
    expect(restTimerPhase(4, 20)).toBe('final');
  });
});

describe('nextRestStep', () => {
  it('пока есть подходы — следующий подход текущего упражнения', () => {
    expect(nextRestStep(0, 3, null)).toEqual({ kind: 'set', setNumber: 1, totalSets: 3 });
    expect(nextRestStep(1, 3, { name: 'Планка', sets: 3, amount: '40с' })).toEqual({
      kind: 'set',
      setNumber: 2,
      totalSets: 3
    });
  });

  it('когда подходы исчерпаны — следующее упражнение дня', () => {
    expect(nextRestStep(3, 3, { name: 'Планка', sets: 3, amount: '40с' })).toEqual({
      kind: 'exercise',
      name: 'Планка',
      sets: 3,
      amount: '40с'
    });
  });

  it('null, когда день кончился или данных нет', () => {
    expect(nextRestStep(3, 3, null)).toBeNull();
    expect(nextRestStep(2, 0, null)).toBeNull();
  });
});
