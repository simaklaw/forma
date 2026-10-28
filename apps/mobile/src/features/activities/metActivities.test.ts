import {
  MET_ACTIVITIES,
  kcalForActivity,
  matchesActivityQuery,
  type MetActivity
} from './metActivities';

const byCode = (code: string): MetActivity =>
  MET_ACTIVITIES.find((a) => a.code === code) as MetActivity;

describe('kcalForActivity (ACSM: MET × 3.5 × кг / 200 × мин)', () => {
  it('считает и округляет ккал', () => {
    // 10 × 3.5 × 70 / 200 = 12.25 ккал/мин → 367.5 за 30 мин → 368
    expect(kcalForActivity(10, 70, 30)).toBe(368);
    // 4.3 × 3.5 × 80 / 200 = 6.02 ккал/мин → 361.2 за 60 мин → 361
    expect(kcalForActivity(4.3, 80, 60)).toBe(361);
    // 2.8 × 3.5 × 60 / 200 = 2.94 ккал/мин → 88.2 за 30 мин → 88
    expect(kcalForActivity(2.8, 60, 30)).toBe(88);
  });

  it('возвращает 0 для некорректного ввода', () => {
    expect(kcalForActivity(0, 70, 30)).toBe(0);
    expect(kcalForActivity(5, 0, 30)).toBe(0);
    expect(kcalForActivity(5, -70, 30)).toBe(0);
    expect(kcalForActivity(5, 70, 0)).toBe(0);
    expect(kcalForActivity(Number.NaN, 70, 30)).toBe(0);
  });
});

describe('matchesActivityQuery', () => {
  it('находит по русскому имени', () => {
    expect(matchesActivityQuery(byCode('12020'), 'бег')).toBe(true);
    expect(matchesActivityQuery(byCode('12020'), 'спорт')).toBe(false);
  });

  it('находит по английскому имени', () => {
    expect(matchesActivityQuery(byCode('18350'), 'swim')).toBe(true);
    expect(matchesActivityQuery(byCode('18350'), 'running')).toBe(false);
  });

  it('ё в запросе совпадает с е в каталоге', () => {
    expect(matchesActivityQuery(byCode('17080'), 'пересеченной')).toBe(true);
    expect(matchesActivityQuery(byCode('17080'), 'пересечённой')).toBe(true);
  });

  it('все токены многотокенного запроса должны найтись', () => {
    expect(matchesActivityQuery(byCode('15590'), 'роликовые коньки')).toBe(true);
    expect(matchesActivityQuery(byCode('15590'), 'роликовые самокат')).toBe(false);
  });

  it('пустой запрос матчит всё', () => {
    for (const a of MET_ACTIVITIES) {
      expect(matchesActivityQuery(a, '   ')).toBe(true);
    }
  });
});

describe('санитария каталога MET_ACTIVITIES', () => {
  it('коды уникальны, MET положительны, имена непустые', () => {
    const codes = new Set<string>();
    for (const a of MET_ACTIVITIES) {
      expect(codes.has(a.code)).toBe(false);
      codes.add(a.code);
      expect(a.mets).toBeGreaterThan(0);
      expect(a.ru.trim().length).toBeGreaterThan(0);
      expect(a.en.trim().length).toBeGreaterThan(0);
    }
  });

  it('каталог достаточно большой и покрывает базовые категории', () => {
    expect(MET_ACTIVITIES.length).toBeGreaterThanOrEqual(40);
    expect(MET_ACTIVITIES.some((a) => matchesActivityQuery(a, 'ходьба'))).toBe(true);
    expect(MET_ACTIVITIES.some((a) => matchesActivityQuery(a, 'велосипед'))).toBe(true);
    expect(MET_ACTIVITIES.some((a) => matchesActivityQuery(a, 'плавание'))).toBe(true);
    expect(MET_ACTIVITIES.some((a) => matchesActivityQuery(a, 'уборка'))).toBe(true);
  });
});
