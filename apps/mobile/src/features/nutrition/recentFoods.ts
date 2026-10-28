/**
 * «Недавние» и «Избранное» в дневнике питания: чистая логика без RN/стора.
 * Продукт идентифицируется нормализованным именем — повторный лог поднимает
 * запись в начало, а не дублирует (one-tap re-log, паттерн OpenNutriTracker).
 */
export interface LoggedFoodSummary {
  name: string;
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
}

export const RECENT_FOODS_LIMIT = 30;
export const FAVORITE_FOODS_LIMIT = 100;

/** Отпечаток продукта: имя без регистра и краевых пробелов. */
export function foodFingerprint(f: LoggedFoodSummary): string {
  return (f.name ?? '').trim().toLowerCase();
}

/** Добавляет/поднимает продукт в «Недавних», дедуп по имени, лимит сверху. */
export function upsertRecentFood(
  list: LoggedFoodSummary[],
  food: LoggedFoodSummary,
  limit: number = RECENT_FOODS_LIMIT
): LoggedFoodSummary[] {
  const fp = foodFingerprint(food);
  const rest = list.filter((f) => foodFingerprint(f) !== fp);
  return [{ ...food }, ...rest].slice(0, limit);
}

/** ★ — снимает, если уже в избранном; иначе добавляет. [список, сталИзбранным]. */
export function toggleFavoriteFood(
  list: LoggedFoodSummary[],
  food: LoggedFoodSummary,
  limit: number = FAVORITE_FOODS_LIMIT
): [LoggedFoodSummary[], boolean] {
  const fp = foodFingerprint(food);
  if (list.some((f) => foodFingerprint(f) === fp)) {
    return [list.filter((f) => foodFingerprint(f) !== fp), false];
  }
  return [[{ ...food }, ...list].slice(0, limit), true];
}
