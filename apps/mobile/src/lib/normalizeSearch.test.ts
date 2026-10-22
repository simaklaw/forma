import { matchesAllTokens, normalizeSearchText } from './normalizeSearch';

describe('normalizeSearchText', () => {
  it('lowercases, folds separators and collapses whitespace', () => {
    expect(normalizeSearchText('  Push-Up   (barbell) ')).toBe('push up barbell');
  });

  it('strips latin diacritics', () => {
    expect(normalizeSearchText('Étagère Çafé')).toBe('etagere cafe');
  });

  it('folds cyrillic ё to е', () => {
    expect(normalizeSearchText('Ёлка Подъём')).toBe('елка подъем');
  });

  it('treats & as a plain separator', () => {
    expect(normalizeSearchText('Chest & Back')).toBe('chest back');
  });

  it('keeps cyrillic letters intact', () => {
    expect(normalizeSearchText('Тяга верхнего блока')).toBe('тяга верхнего блока');
  });

  it('normalizes an empty query to an empty string', () => {
    expect(normalizeSearchText('   ')).toBe('');
  });
});

describe('matchesAllTokens', () => {
  it('matches when every token occurs in the haystack', () => {
    expect(matchesAllTokens('Barbell Bench Press', 'bench press')).toBe(true);
  });

  it('matches across separators and case', () => {
    expect(matchesAllTokens('Push-Up', 'push up')).toBe(true);
  });

  it('is diacritics- and ё-insensitive', () => {
    expect(matchesAllTokens('Подъём штанги', 'подъем')).toBe(true);
    expect(matchesAllTokens('Café Latte', 'cafe')).toBe(true);
  });

  it('rejects when any token is missing (AND search)', () => {
    expect(matchesAllTokens('Push-Up', 'push планка')).toBe(false);
  });

  it('empty query matches everything', () => {
    expect(matchesAllTokens('Anything', '')).toBe(true);
    expect(matchesAllTokens('Anything', '   ')).toBe(true);
  });

  it('empty haystack matches nothing', () => {
    expect(matchesAllTokens('', 'press')).toBe(false);
  });
});
