import { favoriteKey, MAX_RECENT, parseFavoriteKey } from './exerciseFavorites';

describe('exerciseFavorites keys', () => {
  it('builds stable mode:id keys', () => {
    expect(favoriteKey('gym', 7)).toBe('gym:7');
    expect(favoriteKey('home', 12)).toBe('home:12');
  });

  it('parses valid keys', () => {
    expect(parseFavoriteKey('gym:3')).toEqual({ mode: 'gym', id: 3 });
    expect(parseFavoriteKey('home:99')).toEqual({ mode: 'home', id: 99 });
  });

  it('rejects invalid keys', () => {
    expect(parseFavoriteKey('gym')).toBeNull();
    expect(parseFavoriteKey('pool:1')).toBeNull();
    expect(parseFavoriteKey('gym:x')).toBeNull();
  });

  it('keeps a bounded recent window constant', () => {
    expect(MAX_RECENT).toBe(12);
  });
});
