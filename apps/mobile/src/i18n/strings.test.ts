import { STRINGS, tFor } from './strings';
import { useLanguageStore } from './useLanguageStore';

describe('i18n strings', () => {
  it('ru and en dictionaries have identical key sets', () => {
    expect(Object.keys(STRINGS.en).sort()).toEqual(Object.keys(STRINGS.ru).sort());
  });

  it('default language is ru', () => {
    expect(useLanguageStore.getState().lang).toBe('ru');
  });

  it('interpolates variables in both languages', () => {
    expect(tFor('ru')('nutritionRemaining', { kcal: 1234 })).toBe('Осталось 1234 ккал');
    expect(tFor('en')('workoutStreakActive', { count: 5, days: 'days' })).toBe('5-day streak');
  });

  it('tFor falls back to the template when a var is missing', () => {
    expect(tFor('ru')('nutritionRemaining', {})).toBe('Осталось {kcal} ккал');
  });
});
