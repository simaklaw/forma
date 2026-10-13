import type { ImportedSport } from './types.ts';

/** Normalize free-text / FIT sport names into a small union. */
export function normalizeSport(raw: string | undefined | null): ImportedSport {
  if (!raw) return 'other';
  const s = raw.toLowerCase().replace(/[_\s-]+/g, ' ').trim();
  if (/(run|jog|trail)/.test(s)) return 'running';
  if (/(cycl|bike|bik)/.test(s)) return 'cycling';
  if (/(walk)/.test(s)) return 'walking';
  if (/(hik|trek)/.test(s)) return 'hiking';
  if (/(swim)/.test(s)) return 'swimming';
  if (/(strength|weight|train|gym|fitnes)/.test(s)) return 'strength';
  if (/(cardio|elliptical|row|aerobic)/.test(s)) return 'cardio';
  return 'other';
}

export const SPORT_LABEL_RU: Record<ImportedSport, string> = {
  running: 'Бег',
  cycling: 'Вело',
  walking: 'Ходьба',
  hiking: 'Хайкинг',
  swimming: 'Плавание',
  strength: 'Силовая',
  cardio: 'Кардио',
  other: 'Активность',
};
