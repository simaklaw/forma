import { buildCatalogItems, filterCatalogItems } from './catalogBrowser';

describe('catalog browser filters', () => {
  const gym = buildCatalogItems('gym');
  const home = buildCatalogItems('home');

  it('builds gym vs home catalogs separately', () => {
    expect(gym.length).toBeGreaterThan(0);
    expect(home.length).toBeGreaterThan(0);
    expect(gym.every((item) => item.mode === 'gym')).toBe(true);
    expect(home.every((item) => item.mode === 'home')).toBe(true);
  });

  it('searches by Russian name case-insensitively', () => {
    const hits = filterCatalogItems(gym, 'жим', null);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some((item) => item.name.toLowerCase().includes('жим'))).toBe(true);
    expect(filterCatalogItems(gym, 'ЖИМ', null).map((i) => i.id).sort()).toEqual(
      hits.map((i) => i.id).sort()
    );
  });

  it('searches by note / description', () => {
    const hits = filterCatalogItems(home, 'лопатки', null);
    expect(hits.length).toBeGreaterThan(0);
  });

  it('filters by muscle', () => {
    const calves = filterCatalogItems(gym, '', 'calves');
    expect(calves.length).toBeGreaterThan(0);
    expect(calves.every((item) => item.targetMuscles.includes('calves'))).toBe(true);
  });

  it('returns empty for nonsense query', () => {
    expect(filterCatalogItems(gym, 'qwerty-no-such-exercise', null)).toEqual([]);
  });

  it('keeps gym and home exercise ids disjoint', () => {
    const gymIds = new Set(gym.map((item) => item.id));
    const homeIds = new Set(home.map((item) => item.id));
    for (const id of gymIds) {
      expect(homeIds.has(id)).toBe(false);
    }
  });
});
