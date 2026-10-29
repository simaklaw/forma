/**
 * Сканер этикетки продукта (идея — FitSage, OCR таблиц БЖУ; ideas-only).
 * Реализация — через BYOK vision-ассистента: строгий промпт требует от модели
 * JSON с БЖУ на 100 г. Разбор ответа устойчив к markdown-фенсам и прозе
 * вокруг JSON, числа-синонимы (calories/fats/carbohydrates) принимаются,
 * значения клампятся против галлюцинаций. Чистая логика без RN/стора.
 */

export interface LabelScanResult {
  /** ккал на 100 г */
  kcal: number;
  /** белки, г на 100 г */
  protein: number;
  /** жиры, г на 100 г */
  fat: number;
  /** углеводы, г на 100 г */
  carbs: number;
}

/** Строгий промпт: модель обязана вернуть только JSON с БЖУ на 100 г. */
export const LABEL_SCAN_PROMPT = [
  'Read the nutrition facts table in the photo.',
  'Extract values PER 100 GRAMS (per 100 g / «на 100 г»), not per serving.',
  'If the table shows only per-serving values, convert them using the serving size from the label.',
  'Reply with ONLY this JSON object, no markdown fences, no prose:',
  '{"kcal": number, "protein": number, "fat": number, "carbs": number}',
  'kcal = energy per 100 g; protein/fat/carbs = grams per 100 g.',
  'If the table is unreadable, reply exactly: {"error": true}'
].join(' ');

/** Верхние границы на 100 г: защита от галлюцинаций модели и значений «на порцию». */
const KCAL_LIMIT = 900;
const MACRO_LIMIT = 100;

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value.trim().replace(',', '.'));
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

/** Пропускает только неотрицательные значения с потолком. */
function clamp(value: number, max: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.min(value, max);
}

/** Достаёт кандидата JSON из ответа модели: напрямую, из `json`-фенса или из первого {...}. */
export function extractJsonCandidate(raw: string): string | null {
  const text = (raw ?? '').trim();
  if (!text) return null;
  const direct = text.match(/^\{[\s\S]*\}$/);
  if (direct) return text;
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence && fence[1]) return fence[1].trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) return text.slice(start, end + 1);
  return null;
}

/**
 * Разбирает ответ vision-модели. Возвращает значения на 100 г или null,
 * если модель не смогла прочитать таблицу. Считаем распознанным:
 * kcal + хотя бы один макрос, либо два макроса и больше.
 */
export function parseLabelAnswer(raw: string): LabelScanResult | null {
  const candidate = extractJsonCandidate(raw);
  if (!candidate) return null;
  let data: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(candidate);
    if (parsed == null || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    data = parsed as Record<string, unknown>;
  } catch {
    return null;
  }
  if (data.error === true) return null;
  const kcal = toNumber(data.kcal ?? data.calories ?? data.energy);
  const protein = toNumber(data.protein);
  const fat = toNumber(data.fat ?? data.fats);
  const carbs = toNumber(data.carbs ?? data.carbohydrates);
  const macroCount = [protein, fat, carbs].filter((v) => v != null).length;
  const recognized = (kcal != null && macroCount >= 1) || macroCount >= 2;
  if (!recognized) return null;
  return {
    kcal: kcal == null ? 0 : Math.round(clamp(kcal, KCAL_LIMIT)),
    protein: protein == null ? 0 : Math.round(clamp(protein, MACRO_LIMIT) * 10) / 10,
    fat: fat == null ? 0 : Math.round(clamp(fat, MACRO_LIMIT) * 10) / 10,
    carbs: carbs == null ? 0 : Math.round(clamp(carbs, MACRO_LIMIT) * 10) / 10
  };
}
