/** Offline mini tip base — rotates by day-of-year. No network. */

export type DailyTip = {
  id: string;
  category: 'protein' | 'training' | 'recovery' | 'habits';
  title: string;
  body: string;
};

export const DAILY_TIPS: readonly DailyTip[] = [
  {
    id: 'p1',
    category: 'protein',
    title: 'Белок на приём',
    body: '20–40 г белка за приём пищи — практичный диапазон для синтеза мышц. Не обязательно «всё за завтрак».'
  },
  {
    id: 'p2',
    category: 'protein',
    title: 'Распределение белка',
    body: 'Равномернее по дню обычно удобнее, чем один огромный белковый ужин после тренировки.'
  },
  {
    id: 't1',
    category: 'training',
    title: 'Прогрессия',
    body: 'Добавляйте нагрузку малыми шагами: +1 повтор или +2.5 кг, когда техника стабильна.'
  },
  {
    id: 't2',
    category: 'training',
    title: 'Отдых между подходами',
    body: 'Для силовых 2–3 минуты — норма. Слишком короткий отдых часто режет качество повторов.'
  },
  {
    id: 't3',
    category: 'training',
    title: 'Домашний день',
    body: 'Если нет зала — bodyweight-день всё равно считает объём. Главное — завершённые подходы.'
  },
  {
    id: 'r1',
    category: 'recovery',
    title: 'Сон',
    body: '7–9 часов — базовый рычаг восстановления. Без сна прогресс в зале замедляется сильнее, чем от пропущенного перекуса.'
  },
  {
    id: 'r2',
    category: 'recovery',
    title: 'После тяжёлого дня',
    body: 'Лёгкая ходьба и белок важнее «ещё одного жёсткого дня» подряд при сильной усталости.'
  },
  {
    id: 'h1',
    category: 'habits',
    title: 'Вода',
    body: 'Отмечайте стаканы в «Питании». Жажда часто маскируется под голод между приёмами пищи.'
  },
  {
    id: 'h2',
    category: 'habits',
    title: 'Логирование',
    body: 'Запись подходов в тот же день точнее, чем вспоминать объём через неделю.'
  },
  {
    id: 'h3',
    category: 'habits',
    title: 'Плато веса',
    body: 'При длительном дефиците вес может замереть. Рефид / diet break в профиле — осознанный инструмент, не «срыв».'
  }
] as const;

/** Stable tip for a calendar day (UTC date key). */
export function tipForDate(date: Date = new Date()): DailyTip {
  const start = Date.UTC(date.getFullYear(), 0, 0);
  const now = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const dayOfYear = Math.floor((now - start) / 86_400_000);
  const idx = dayOfYear % DAILY_TIPS.length;
  return DAILY_TIPS[idx] ?? DAILY_TIPS[0];
}
