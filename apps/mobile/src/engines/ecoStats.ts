/**
 * Эко-эффект активности: сколько CO₂ «не выброшено», потому что километры
 * пройдены / пробеганы / проеханы на велосипеде, а не на машине.
 * Идея карточки — из AOSSIE-Org/CarbonTracker (GPLv3, ideas-only);
 * реализация и коэффициенты — свои, см. CAR_EMISSION_G_PER_KM.
 */
import { toDateKey } from '@forma/core';

/**
 * Средние полные выбросы легкового автомобиля, г CO₂ на км
 * (округлённая консервативная оценка выхлопа + жизненного цикла,
 * порядок величины ICCT/EEA для ЕС). В карточке подписываем «≈».
 */
export const CAR_EMISSION_G_PER_KM = 250;

/**
 * Типичные скорости эко-активностей MET-каталога (км/ч). Ключ — код
 * Compendium 2011: для бега/велосипеда/бодрой ходьбы скорость указана
 * прямо в названии, для остальных — типичные оценки. Велотренажёр,
 * скакалка, лестницы и быт сюда сознательно не входят: они не
 * заменяют поездку на машине.
 */
const ECO_SPEED_KMH_BY_CODE: Record<string, number> = {
  // Ходьба и походы
  '17170': 3.0, // Ходьба, медленно (~3 км/ч)
  '17190': 5.5, // Ходьба, быстро (~5,5 км/ч)
  '17165': 4.0, // Прогулка с собакой
  '17080': 4.5, // Пеший поход по пересечённой местности
  '17010': 4.5, // Туризм с рюкзаком
  // Бег
  '12020': 8.0, // Бег трусцой
  '12051': 8.0, // Бег ~8 км/ч
  '12053': 10.0, // Бег ~10 км/ч
  '12055': 11.0, // Бег ~11 км/ч
  '12057': 13.0, // Бег ~13 км/ч
  // Велосипед (уличный, не тренажёр)
  '01015': 14.0, // Велосипед, неспешно (<16 км/ч)
  '01020': 17.5, // Велосипед ~16–19 км/ч
  '01025': 20.5, // Велосипед ~19–22 км/ч
  '01009': 16.0 // Маунтинбайк
};

/** Импортированные виды спорта (FIT/TCX/GPX), заменяющие поездку на машине. */
const ECO_IMPORTED_SPORTS = new Set(['walking', 'hiking', 'running', 'cycling']);

export interface EcoSummary {
  /** Километры активным транспортом за окно. */
  distanceKm: number;
  /** CO₂ (кг), который выбросила бы машина на этой дистанции. */
  co2SavedKg: number;
  /** Дней окна, в которые была эко-активность. */
  activeDays: number;
}

/** Дистанция ручной активности MET-каталога (км); null — код не эко. */
export function ecoDistanceKmForCode(code: string, durationMin: number): number | null {
  const speed = ECO_SPEED_KMH_BY_CODE[code];
  if (!speed || durationMin <= 0) return null;
  return (speed * durationMin) / 60;
}

/**
 * Сводка эко-эффекта за последние windowDays дней (включая сегодня).
 * Ручной лог считается по скорости из MET-каталога; импорт с часов/GPS —
 * по фактической дистанции файла (записи без дистанции пропускаем).
 */
export function selectEcoSummary(
  loggedActivities: { code: string; durationMin: number; dateKey: string }[],
  importedActivities: { sport: string; distanceM?: number; dateKey: string }[],
  windowDays: number,
  now: Date = new Date()
): EcoSummary {
  const windowKeys = new Set<string>();
  for (let i = 0; i < windowDays; i += 1) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    windowKeys.add(toDateKey(d));
  }

  let distanceKm = 0;
  const activeDates = new Set<string>();

  for (const a of loggedActivities) {
    if (!windowKeys.has(a.dateKey)) continue;
    const km = ecoDistanceKmForCode(a.code, a.durationMin);
    if (km == null) continue;
    distanceKm += km;
    activeDates.add(a.dateKey);
  }

  for (const a of importedActivities) {
    if (!windowKeys.has(a.dateKey)) continue;
    if (!ECO_IMPORTED_SPORTS.has(a.sport)) continue;
    const km = (a.distanceM ?? 0) / 1000;
    if (km <= 0) continue;
    distanceKm += km;
    activeDates.add(a.dateKey);
  }

  return {
    distanceKm: Math.round(distanceKm * 10) / 10,
    co2SavedKg: Math.round(((distanceKm * CAR_EMISSION_G_PER_KM) / 1000) * 100) / 100,
    activeDays: activeDates.size
  };
}
