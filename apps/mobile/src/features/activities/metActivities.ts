/**
 * Каталог кардио/бытовых активностей с MET-значениями из Compendium of
 * Physical Activities (Ainsworth et al., 2011, округления). Идея ручного
 * лога «активность × длительность → сожжённые ккал» взята из
 * OpenNutriTracker / nutri-tracker; код и структура — свои.
 *
 * RU/EN имена лежат прямо в каталоге: это данные, а не UI-строки —
 * в strings.ts их не добавляем (они не участвуют в парности ключей).
 * В логе на стор хранится имя на момент добавления, поэтому смена
 * языка не ломает уже записанные активности.
 */

export interface MetActivity {
  /** Код Compendium 2011 — для трассируемости MET-значения. */
  code: string;
  ru: string;
  en: string;
  mets: number;
}

/** ACSM: ккал/мин = MET × 3.5 × вес(кг) / 200. */
export function kcalForActivity(mets: number, weightKg: number, durationMin: number): number {
  if (!Number.isFinite(mets) || mets <= 0 || weightKg <= 0 || durationMin <= 0) return 0;
  return Math.round(((mets * 3.5 * weightKg) / 200) * durationMin);
}

/** Нормализация поискового текста: lower-case + ё→е. */
function normalize(s: string): string {
  return s.toLowerCase().replace(/ё/g, 'е');
}

/** Каждый токен запроса должен встретиться в ru- или en-имени. */
export function matchesActivityQuery(a: MetActivity, query: string): boolean {
  const tokens = normalize(query).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  const hay = `${normalize(a.ru)} ${normalize(a.en)}`;
  return tokens.every((tok) => hay.includes(tok));
}

export const MET_ACTIVITIES: readonly MetActivity[] = [
  // Ходьба и бег
  { code: '17170', ru: 'Ходьба, медленно (~3 км/ч)', en: 'Walking, slow (~3 km/h)', mets: 2.8 },
  { code: '17190', ru: 'Ходьба, быстро (~5.5 км/ч)', en: 'Walking, brisk (~5.5 km/h)', mets: 4.3 },
  { code: '17165', ru: 'Прогулка с собакой', en: 'Walking the dog', mets: 3.0 },
  { code: '17080', ru: 'Пеший поход по пересечённой местности', en: 'Hiking, cross-country', mets: 6.0 },
  { code: '17010', ru: 'Туризм с рюкзаком', en: 'Backpacking', mets: 7.0 },
  { code: '12020', ru: 'Бег трусцой', en: 'Jogging, general', mets: 7.0 },
  { code: '12051', ru: 'Бег ~8 км/ч', en: 'Running ~8 km/h', mets: 8.3 },
  { code: '12053', ru: 'Бег ~10 км/ч', en: 'Running ~10 km/h', mets: 9.8 },
  { code: '12055', ru: 'Бег ~11 км/ч', en: 'Running ~11 km/h', mets: 11.0 },
  { code: '12057', ru: 'Бег ~13 км/ч', en: 'Running ~13 km/h', mets: 12.8 },
  { code: '02068', ru: 'Прыжки со скакалкой', en: 'Rope skipping', mets: 11.8 },
  { code: '17050', ru: 'Подъём по лестнице, быстро', en: 'Stair climbing, fast', mets: 8.8 },
  // Велосипед и кардиотренажёры
  { code: '01015', ru: 'Велосипед, неспешно (<16 км/ч)', en: 'Bicycling, leisure (<16 km/h)', mets: 4.0 },
  { code: '01020', ru: 'Велосипед ~16–19 км/ч', en: 'Bicycling ~16–19 km/h', mets: 6.8 },
  { code: '01025', ru: 'Велосипед ~19–22 км/ч', en: 'Bicycling ~19–22 km/h', mets: 8.0 },
  { code: '01009', ru: 'Маунтинбайк', en: 'Mountain bicycling', mets: 8.0 },
  { code: '02010', ru: 'Велотренажёр, умеренно', en: 'Stationary bike, moderate', mets: 6.8 },
  { code: '02052', ru: 'Эллипсоид', en: 'Elliptical trainer', mets: 5.0 },
  { code: '21010', ru: 'Гребной тренажёр, умеренно', en: 'Rowing machine, moderate', mets: 7.0 },
  // Аэробика, танцы, гимнастика
  { code: '03015', ru: 'Аэробика, общая', en: 'Aerobics, general', mets: 7.3 },
  { code: '03030', ru: 'Танцы, медленные', en: 'Dancing, slow', mets: 3.0 },
  { code: '03031', ru: 'Танцы, быстрые', en: 'Dancing, fast', mets: 5.0 },
  { code: '02030', ru: 'Калланетика / разминка, общая', en: 'Calisthenics, general', mets: 3.8 },
  { code: '02031', ru: 'Упражнения с весом тела, интенсивно', en: 'Calisthenics, vigorous', mets: 8.0 },
  { code: '02039', ru: 'Растяжка / хатха-йога', en: 'Stretching / hatha yoga', mets: 2.5 },
  { code: '02053', ru: 'Пилатес', en: 'Pilates', mets: 3.0 },
  // Плавание и вода
  { code: '18350', ru: 'Плавание кролем, умеренно', en: 'Swimming, freestyle, moderate', mets: 5.8 },
  { code: '18355', ru: 'Аквааэробика', en: 'Water aerobics', mets: 5.3 },
  { code: '18100', ru: 'Байдарка / каноэ, умеренно', en: 'Kayaking / canoeing, moderate', mets: 5.0 },
  { code: '18210', ru: 'Снорклинг', en: 'Snorkeling', mets: 3.5 },
  { code: '18225', ru: 'Сапборд (гребля стоя)', en: 'Stand-up paddle boarding', mets: 6.0 },
  // Спорт и игры
  { code: '15610', ru: 'Футбол, любительский', en: 'Soccer, casual', mets: 7.0 },
  { code: '15055', ru: 'Баскетбол, любительский', en: 'Basketball, casual', mets: 6.5 },
  { code: '15710', ru: 'Волейбол, любительский', en: 'Volleyball, casual', mets: 3.0 },
  { code: '15675', ru: 'Теннис, одиночный', en: 'Tennis, singles', mets: 7.3 },
  { code: '15660', ru: 'Настольный теннис', en: 'Table tennis', mets: 4.0 },
  { code: '15030', ru: 'Бадминтон, любительский', en: 'Badminton, casual', mets: 4.5 },
  { code: '15652', ru: 'Сквош', en: 'Squash', mets: 7.3 },
  { code: '15430', ru: 'Единоборства (дзюдо, карате)', en: 'Martial arts (judo, karate)', mets: 10.3 },
  { code: '15100', ru: 'Бокс, спарринг', en: 'Boxing, sparring', mets: 7.8 },
  { code: '15240', ru: 'Алтимат-фрисби', en: 'Ultimate frisbee', mets: 3.0 },
  { code: '15580', ru: 'Скейтбординг', en: 'Skateboarding', mets: 4.0 },
  { code: '15590', ru: 'Роликовые коньки', en: 'Roller skating', mets: 7.1 },
  { code: '15255', ru: 'Гольф (ходьбой)', en: 'Golf, walking', mets: 4.3 },
  { code: '15370', ru: 'Верховая езда', en: 'Horseback riding', mets: 3.8 },
  // Зима
  { code: '19030', ru: 'Коньки, умеренно', en: 'Ice skating, moderate', mets: 5.5 },
  { code: '19075', ru: 'Горные лыжи, умеренно', en: 'Downhill skiing, moderate', mets: 6.0 },
  { code: '19020', ru: 'Лыжи (кросс-кантри), умеренно', en: 'Cross-country skiing, moderate', mets: 9.0 },
  { code: '19040', ru: 'Сноуборд', en: 'Snowboarding', mets: 5.3 },
  // Дом и быт
  { code: '05050', ru: 'Уборка дома', en: 'House cleaning', mets: 3.3 },
  { code: '08040', ru: 'Работа в саду / огороде', en: 'Gardening', mets: 3.8 },
  { code: '08071', ru: 'Кошение газона (косилка)', en: 'Mowing lawn, power mower', mets: 5.5 },
  { code: '09030', ru: 'Прогулка по магазинам', en: 'Shopping, walking', mets: 2.3 },
  { code: '05030', ru: 'Готовка', en: 'Cooking', mets: 2.5 },
  { code: '05020', ru: 'Активная игра с детьми', en: 'Playing with children, active', mets: 3.5 },
  { code: '06030', ru: 'Подъём тяжёлых предметов по лестнице', en: 'Carrying heavy loads upstairs', mets: 6.0 },
  { code: '06015', ru: 'Стоячая работа (лёгкая)', en: 'Standing, light work', mets: 3.0 },
  { code: '07010', ru: 'Работа за компьютером (сидя)', en: 'Sitting, computer work', mets: 1.5 }
];
