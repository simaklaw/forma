import { MICRO_REFERENCE, hasAnyMicros, sumDailyMicros } from './dailyMicros';

describe('dailyMicros', () => {
  it('складывает микронутриенты всех позиций и округляет до 0.1 г', () => {
    const res = sumDailyMicros([
      { fiber: 2.5, sugars: 4, saturatedFat: 1, sodiumMg: 120 },
      { fiber: 1, sugars: 6.25, saturatedFat: 2.4, sodiumMg: 380.4 }
    ]);
    expect(res.fiber).toBe(3.5);
    expect(res.sugars).toBe(10.3);
    expect(res.saturatedFat).toBe(3.4);
    expect(res.sodiumMg).toBe(500);
  });

  it('отсутствующие значения считаются нулём', () => {
    const res = sumDailyMicros([{}, { fiber: 3 }]);
    expect(res.fiber).toBe(3);
    expect(res.sugars).toBe(0);
    expect(res.saturatedFat).toBe(0);
    expect(res.sodiumMg).toBe(0);
  });

  it('пустой список даёт нули', () => {
    expect(sumDailyMicros([])).toEqual({ fiber: 0, sugars: 0, saturatedFat: 0, sodiumMg: 0 });
  });

  it('hasAnyMicros отличает пустой день от дня с данными', () => {
    expect(hasAnyMicros({ fiber: 0, sugars: 0, saturatedFat: 0, sodiumMg: 0 })).toBe(false);
    expect(hasAnyMicros({ fiber: 0, sugars: 0, saturatedFat: 0, sodiumMg: 15 })).toBe(true);
    expect(hasAnyMicros({ fiber: 0.1, sugars: 0, saturatedFat: 0, sodiumMg: 0 })).toBe(true);
  });

  it('референсы DRI-style зафиксированы', () => {
    expect(MICRO_REFERENCE).toEqual({ fiber: 30, sugars: 50, saturatedFat: 20, sodiumMg: 2300 });
  });
});
