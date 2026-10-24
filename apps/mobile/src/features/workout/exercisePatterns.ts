/**
 * Паттерн движения для каждого упражнения: планы + эвристика по имени
 * для импортированной библиотеки. Таксономия движений (squat / hinge /
 * push / pull) — общеизвестная фитнес-концепция из обзора GymBells
 * (clean-room): назначение паттернов и код собственные.
 */
import type { MovementPattern } from '@forma/core';
import { allImportedExerciseNames } from './importedExerciseBridge';

/** Паттерны упражнений планов (id стабильны: 1–30 заморожены для истории). */
export const PLAN_PATTERNS: Record<number, MovementPattern> = {
  // жимы
  4: 'push_horizontal',
  25: 'push_horizontal',
  23: 'push_horizontal',
  31: 'push_horizontal',
  10: 'push_horizontal',
  48: 'push_horizontal',
  49: 'push_horizontal',
  59: 'push_horizontal',
  5: 'push_vertical',
  40: 'push_vertical',
  19: 'push_vertical',
  18: 'push_vertical',
  55: 'push_vertical',
  // тяги
  7: 'pull_horizontal',
  24: 'pull_horizontal',
  26: 'pull_horizontal',
  33: 'pull_horizontal',
  50: 'pull_horizontal',
  12: 'pull_horizontal',
  8: 'pull_vertical',
  11: 'pull_vertical',
  // приседания и выпады
  1: 'squat',
  22: 'squat',
  28: 'squat',
  35: 'squat',
  3: 'squat',
  30: 'squat',
  13: 'squat',
  14: 'squat',
  51: 'squat',
  52: 'squat',
  57: 'squat',
  58: 'squat',
  62: 'squat',
  // шарниры: становая, румынская тяга, мостик
  2: 'hinge',
  37: 'hinge',
  29: 'hinge',
  20: 'hinge',
  21: 'hinge',
  60: 'hinge',
  // кор
  15: 'core',
  16: 'core',
  17: 'core',
  53: 'core',
  54: 'core',
  61: 'core',
  // изоляция
  32: 'isolation',
  27: 'isolation',
  38: 'isolation',
  41: 'isolation',
  42: 'isolation',
  43: 'isolation',
  6: 'isolation',
  9: 'isolation',
  34: 'isolation',
  44: 'isolation',
  45: 'isolation',
  46: 'isolation',
  47: 'isolation',
  39: 'isolation',
  36: 'isolation',
  56: 'isolation'
};

/**
 * Эвристика для импортированной библиотеки (EN-названия).
 * Первый подошедший шаблон выигрывает; без совпадений — изоляция.
 */
const PATTERN_RULES: ReadonlyArray<{ pattern: MovementPattern; re: RegExp }> = [
  { pattern: 'core', re: /plank|crunch|sit[- ]?up|dead bug|leg raise|hollow|twist|\bab\b/i },
  {
    pattern: 'hinge',
    re: /deadlift|romanian|rdl|good morning|hip thrust|glute bridge|hyperextension|back extension|swing/i
  },
  { pattern: 'squat', re: /squat|lunge|step[- ]?up|leg press/i },
  { pattern: 'pull_vertical', re: /pull[- ]?up|chin[- ]?up|pulldown|pull[- ]?down/i },
  { pattern: 'pull_horizontal', re: /row|pullover/i },
  { pattern: 'push_horizontal', re: /bench press|chest press|push[- ]?up|pushup|fly|crossover/i },
  { pattern: 'push_vertical', re: /press|\bdip\b|handstand/i }
];

export function patternFromImportedName(nameEn: string): MovementPattern {
  for (const rule of PATTERN_RULES) {
    if (rule.re.test(nameEn)) return rule.pattern;
  }
  return 'isolation';
}

/** exerciseId → паттерн движения (планы + импортированная библиотека). */
export function allExercisePatterns(): Record<number, MovementPattern> {
  const out: Record<number, MovementPattern> = { ...PLAN_PATTERNS };
  for (const ex of allImportedExerciseNames()) {
    out[ex.id] = patternFromImportedName(ex.nameEn);
  }
  return out;
}
