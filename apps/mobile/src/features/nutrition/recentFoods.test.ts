import {
  foodFingerprint,
  upsertRecentFood,
  toggleFavoriteFood,
  RECENT_FOODS_LIMIT,
  type LoggedFoodSummary
} from './recentFoods';

const apple: LoggedFoodSummary = {
  name: 'Яблоко, 1 шт.',
  kcal: 52,
  protein: 0.3,
  fat: 0.2,
  carbs: 14
};

describe('foodFingerprint', () => {
  it('нечувствителен к регистру и краевым пробелам', () => {
    expect(foodFingerprint(apple)).toBe(foodFingerprint({ ...apple, name: '  яблоко, 1 ШТ. ' }));
  });
});

describe('upsertRecentFood', () => {
  it('ставит новый продукт в начало', () => {
    const list = upsertRecentFood([], apple);
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('Яблоко, 1 шт.');
  });

  it('дедуп по имени: повторный лог поднимает запись, а не дублирует', () => {
    const banana: LoggedFoodSummary = { name: 'Банан', kcal: 89, protein: 1, fat: 0.3, carbs: 23 };
    let list = upsertRecentFood([], banana);
    list = upsertRecentFood(list, apple);
    list = upsertRecentFood(list, banana);
    expect(list).toHaveLength(2);
    expect(list[0].name).toBe('Банан');
  });

  it('не мутирует исходный список', () => {
    const list: LoggedFoodSummary[] = [];
    upsertRecentFood(list, apple);
    expect(list).toHaveLength(0);
  });

  it('ограничивает список лимитом', () => {
    let list: LoggedFoodSummary[] = [];
    for (let i = 0; i < RECENT_FOODS_LIMIT + 10; i++) {
      list = upsertRecentFood(list, { name: 'Продукт ' + i, kcal: i, protein: 0, fat: 0, carbs: 0 });
    }
    expect(list).toHaveLength(RECENT_FOODS_LIMIT);
    expect(list[0].name).toBe('Продукт ' + (RECENT_FOODS_LIMIT + 9));
  });
});

describe('toggleFavoriteFood', () => {
  it('добавляет в избранное и возвращает true', () => {
    const [list, nowFav] = toggleFavoriteFood([], apple);
    expect(nowFav).toBe(true);
    expect(list).toHaveLength(1);
  });

  it('снимает звезду и возвращает false', () => {
    const [withFav] = toggleFavoriteFood([], apple);
    const [list, nowFav] = toggleFavoriteFood(withFav, apple);
    expect(nowFav).toBe(false);
    expect(list).toHaveLength(0);
  });

  it('не трогает остальные записи', () => {
    const banana: LoggedFoodSummary = { name: 'Банан', kcal: 89, protein: 1, fat: 0.3, carbs: 23 };
    const [withBanana] = toggleFavoriteFood([], banana);
    const [list] = toggleFavoriteFood(withBanana, apple);
    expect(list.map((f) => f.name)).toContain('Банан');
  });
});
