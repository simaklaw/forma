/**
 * Микронутриенты дневника: клетчатка, сахара, насыщенные жиры, натрий.
 * Данные приходят из Open Food Facts (есть не у всех продуктов);
 * референсы — суточные ориентиры, а не медицинские цели.
 */

export interface MicroSource {
  fiber?: number;
  sugars?: number;
  saturatedFat?: number;
  sodiumMg?: number;
}

export interface DailyMicros {
  fiber: number;
  sugars: number;
  saturatedFat: number;
  sodiumMg: number;
}

/** Ориентиры на день: клетчатка 30 г, сахара ≤50 г, насыщ. жиры ≤20 г, натрий ≤2300 мг. */
export const MICRO_REFERENCE: DailyMicros = {
  fiber: 30,
  sugars: 50,
  saturatedFat: 20,
  sodiumMg: 2300
};

/** Сумма микронутриентов по позициям дня; отсутствующие значения считаются нулём. */
export function sumDailyMicros(items: readonly MicroSource[]): DailyMicros {
  let fiber = 0;
  let sugars = 0;
  let saturatedFat = 0;
  let sodiumMg = 0;
  for (const item of items) {
    fiber += item.fiber ?? 0;
    sugars += item.sugars ?? 0;
    saturatedFat += item.saturatedFat ?? 0;
    sodiumMg += item.sodiumMg ?? 0;
  }
  return {
    fiber: Math.round(fiber * 10) / 10,
    sugars: Math.round(sugars * 10) / 10,
    saturatedFat: Math.round(saturatedFat * 10) / 10,
    sodiumMg: Math.round(sodiumMg)
  };
}

/** Есть ли вообще данные о микронутриентах (карточку не показываем на пустом дне). */
export function hasAnyMicros(m: DailyMicros): boolean {
  return m.fiber > 0 || m.sugars > 0 || m.saturatedFat > 0 || m.sodiumMg > 0;
}
