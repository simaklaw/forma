/**
 * parseGymCsv — импорт истории силовых тренировок из CSV-экспортов Hevy и Strong.
 * Форматы восстановлены по публичной документации экспортных файлов обоих
 * приложений; реализация собственная, код Hevy/Strong не используется.
 * Чистый строковый разбор без зависимостей — безопасно для React Native.
 */
import { toDateKey } from '../engines/WorkoutStats.ts';

/** Источник импорта: CSV-экспорт Hevy или Strong. */
export type GymCsvFormat = 'hevy' | 'strong';

/** Один импортированный подход силового упражнения. */
export interface ImportedGymSet {
  exerciseName: string;
  workoutName: string;
  /** День подхода в формате YYYY-MM-DD. */
  dateKey: string;
  /** Номер подхода внутри упражнения (для порядка отображения). */
  setIndex: number;
  /** Вес в килограммах (фунты приведены); 0 — собственный вес. */
  weightKg: number;
  reps: number;
  /** Запас в повторениях (RIR); приведён из RPE, если экспорт её содержит. */
  rir: number;
}

export interface GymCsvParseResult {
  format: GymCsvFormat;
  sets: ImportedGymSet[];
  warnings: string[];
}

/** Фунты → килограммы. */
const LB_TO_KG = 0.45359237;
/** RIR по умолчанию, когда RPE в экспорте не указана. */
const DEFAULT_RIR = 2;

/** Разбор CSV с учётом кавычек: поля могут содержать разделители и переводы строк. */
function parseCsvRows(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (ch !== '\r') {
      field += ch;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** Разделитель определяется по строке заголовка: ';' или ','. */
function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  const semis = (firstLine.match(/;/g) ?? []).length;
  const commas = (firstLine.match(/,/g) ?? []).length;
  return semis > commas ? ';' : ',';
}

/**
 * Дата во встречающихся форматах: "28 Mar 2025, 17:29" (Hevy), ISO и
 * "2020-12-30 18:51:52" (Strong). Некорректная дата → null.
 */
function parseDateMs(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;
  for (const candidate of [s, s.replace(/,/g, ''), s.replace(' ', 'T')]) {
    const ms = Date.parse(candidate);
    if (Number.isFinite(ms)) return ms;
  }
  return null;
}

/** Число: пустая строка и '-' → null; десятичная запятая допускается. */
function parseNum(raw: string): number | null {
  const s = raw.trim().replace(',', '.');
  if (!s || s === '-') return null;
  const v = Number(s);
  return Number.isFinite(v) ? v : null;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function lbsToKg(v: number): number {
  return round2(v * LB_TO_KG);
}

/** RPE 1..10 → RIR (10 − RPE); значение вне диапазона → null. */
function rirFromRpe(raw: string): number | null {
  const v = parseNum(raw);
  if (v == null || v < 1 || v > 10) return null;
  return Math.min(10, Math.max(0, 10 - Math.round(v)));
}

/** Определение формата по заголовку: 'hevy' | 'strong' | null. */
export function detectGymCsvFormat(text: string): GymCsvFormat | null {
  const header = (parseCsvRows(text, detectDelimiter(text))[0] ?? []).map((h) =>
    h.toLowerCase().trim(),
  );
  if (header.length === 0) return null;
  if (header.includes('exercise_title') && header.includes('set_type')) return 'hevy';
  if (
    header.includes('exercise name') ||
    header.includes('set order') ||
    header.includes('workout #')
  ) {
    return 'strong';
  }
  return null;
}

/** Разбор экспорта Hevy: одна строка CSV = один подход. */
export function parseHevyCsv(text: string): GymCsvParseResult {
  const rows = parseCsvRows(text, detectDelimiter(text));
  const header = (rows[0] ?? []).map((h) => h.toLowerCase().trim());
  const idx = (name: string) => header.indexOf(name);
  const iTitle = idx('title');
  const iStart = idx('start_time');
  const iExercise = idx('exercise_title');
  const iSetIndex = idx('set_index');
  const iSetType = idx('set_type');
  const iReps = idx('reps');
  const iRpe = idx('rpe');
  const iKg = idx('weight_kg');
  const iLbs = idx('weight_lbs');

  const sets: ImportedGymSet[] = [];
  const warnings: string[] = [];
  let skipped = 0;
  for (const row of rows.slice(1)) {
    if (row.every((f) => f.trim() === '')) continue;
    const exerciseName = (row[iExercise] ?? '').trim();
    const ms = parseDateMs(row[iStart] ?? '');
    const reps = parseNum(row[iReps] ?? '');
    if (!exerciseName || ms == null || reps == null || reps <= 0) {
      skipped++;
      continue;
    }
    // Пустой вес — собственный вес тела; фунты приводятся к килограммам.
    const rawKg = iKg >= 0 ? parseNum(row[iKg] ?? '') : null;
    const rawLbs = iLbs >= 0 ? parseNum(row[iLbs] ?? '') : null;
    let weightKg = 0;
    if (rawKg != null) weightKg = round2(rawKg);
    else if (rawLbs != null) weightKg = lbsToKg(rawLbs);
    const setType = (row[iSetType] ?? '').trim().toLowerCase();
    let rir = rirFromRpe(row[iRpe] ?? '');
    // Без RPE: подход «до отказа» → RIR 0, иначе умеренный запас по умолчанию.
    if (rir == null) rir = setType === 'failure' ? 0 : DEFAULT_RIR;
    const setIndex = parseNum(row[iSetIndex] ?? '') ?? 0;
    sets.push({
      exerciseName,
      workoutName: (row[iTitle] ?? '').trim() || exerciseName,
      dateKey: toDateKey(new Date(ms)),
      setIndex,
      weightKg,
      reps: Math.round(reps),
      rir,
    });
  }
  if (skipped > 0) {
    warnings.push('Hevy: пропущено строк с некорректной датой или повторами: ' + skipped);
  }
  return { format: 'hevy', sets, warnings };
}

/**
 * Разбор экспорта Strong: варианты с ',' и ';', колонки «Weight (kg)»,
 * «Weight Unit» или вес без единицы (принимается за кг); строки
 * «Rest Timer» пропускаются.
 */
export function parseStrongCsv(text: string): GymCsvParseResult {
  const rows = parseCsvRows(text, detectDelimiter(text));
  const header = (rows[0] ?? []).map((h) => h.toLowerCase().trim());
  const idx = (name: string) => header.indexOf(name);
  const first = (names: string[]) => {
    for (const name of names) {
      const i = idx(name);
      if (i >= 0) return i;
    }
    return -1;
  };
  const iDate = first(['date']);
  const iWorkoutName = first(['workout name']);
  const iWorkoutNum = first(['workout #']);
  const iExercise = first(['exercise name', 'exercise title']);
  const iSetOrder = first(['set order']);
  const iKg = first(['weight (kg)']);
  const iLb = first(['weight (lb)', 'weight (lbs)']);
  const iW = first(['weight']);
  const iUnit = first(['weight unit']);
  const iReps = first(['reps']);
  const iRpe = first(['rpe']);

  const sets: ImportedGymSet[] = [];
  const warnings: string[] = [];
  let skipped = 0;
  for (const row of rows.slice(1)) {
    if (row.every((f) => f.trim() === '')) continue;
    const exerciseName = (row[iExercise] ?? '').trim();
    const setOrder = parseNum(row[iSetOrder] ?? '');
    // «Rest Timer» и строки без номера подхода — не силовые подходы.
    if (setOrder == null) continue;
    const ms = parseDateMs(row[iDate] ?? '');
    const reps = parseNum(row[iReps] ?? '');
    if (!exerciseName || ms == null || reps == null || reps <= 0) {
      skipped++;
      continue;
    }
    const rawKg = iKg >= 0 ? parseNum(row[iKg] ?? '') : null;
    const rawLb = iLb >= 0 ? parseNum(row[iLb] ?? '') : null;
    const rawW = iW >= 0 ? parseNum(row[iW] ?? '') : null;
    let weightKg = 0;
    if (rawKg != null) {
      weightKg = round2(rawKg);
    } else if (rawLb != null) {
      weightKg = lbsToKg(rawLb);
    } else if (rawW != null) {
      const unit = (iUnit >= 0 ? row[iUnit] ?? '' : '').trim().toLowerCase();
      weightKg = unit === 'lb' || unit === 'lbs' ? lbsToKg(rawW) : round2(rawW);
    }
    const workoutName =
      (iWorkoutName >= 0 ? (row[iWorkoutName] ?? '').trim() : '') ||
      (iWorkoutNum >= 0 ? 'Workout ' + (row[iWorkoutNum] ?? '').trim() : '') ||
      exerciseName;
    sets.push({
      exerciseName,
      workoutName,
      dateKey: toDateKey(new Date(ms)),
      setIndex: Math.round(setOrder),
      weightKg,
      reps: Math.round(reps),
      rir: rirFromRpe(row[iRpe] ?? '') ?? DEFAULT_RIR,
    });
  }
  if (skipped > 0) {
    warnings.push('Strong: пропущено строк с некорректной датой или повторами: ' + skipped);
  }
  return { format: 'strong', sets, warnings };
}

/** Универсальный вход: определить формат и разобрать; иначе бросить ошибку. */
export function parseGymCsv(text: string): GymCsvParseResult {
  const format = detectGymCsvFormat(text);
  if (format === 'hevy') return parseHevyCsv(text);
  if (format === 'strong') return parseStrongCsv(text);
  throw new Error('Формат CSV не распознан: ожидается экспорт Hevy или Strong');
}
