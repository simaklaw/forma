/**
 * Цели по упражнению: целевой вес на одно повторение (например, «жим 100 кг»).
 * Идея — из NeXTormer/NeverSkip (AGPLv3, ideas-only); реализация — своя.
 * Движок чистый, без React: парсинг ввода, оборонительная нормализация
 * для persist-снапшотов и оценка прогресса цели по сет-логам.
 */

export interface GoalSetLog {
  exerciseId: number;
  dateKey: string;
  weight: number;
}

export interface ExerciseGoal {
  exerciseId: number;
  targetWeightKg: number;
  createdAt: number;
}

export interface GoalProgress {
  exerciseId: number;
  targetWeightKg: number;
  /** Лучший поднятый вес по этому упражнению (0 — нет подходов). */
  bestWeightKg: number;
  /** dateKey подхода с лучшим весом; null — нет подходов. */
  bestDateKey: string | null;
  /** 0..1, доля цели; у достигнутых — ровно 1. */
  progressPct: number;
  /** Сколько кг не хватает до цели (0 у достигнутых). */
  remainingKg: number;
  reached: boolean;
}

const round1 = (n: number): number => Math.round(n * 10) / 10;

/** Парсер ввода веса: '80' → 80, '72,5' → 72.5; мусор и <= 0 → null. */
export function parseTargetWeightKg(input: string): number | null {
  const n = Number(input.trim().replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0) return null;
  return round1(n);
}

/**
 * Оборонительная нормализация снапшота из AsyncStorage: остаются только
 * валидные цели, дубли по exerciseId выигрывает последний, порядок по createdAt.
 */
export function normalizeGoals(raw: unknown): ExerciseGoal[] {
  if (!Array.isArray(raw)) return [];
  const byId = new Map<number, ExerciseGoal>();
  for (const item of raw) {
    const g = (item ?? {}) as Partial<ExerciseGoal>;
    const exerciseId =
      typeof g.exerciseId === 'number' && Number.isInteger(g.exerciseId) ? g.exerciseId : null;
    const targetWeightKg =
      typeof g.targetWeightKg === 'number' &&
      Number.isFinite(g.targetWeightKg) &&
      g.targetWeightKg > 0
        ? round1(g.targetWeightKg)
        : null;
    const createdAt =
      typeof g.createdAt === 'number' && Number.isFinite(g.createdAt) ? g.createdAt : 0;
    if (exerciseId == null || targetWeightKg == null) continue;
    byId.set(exerciseId, { exerciseId, targetWeightKg, createdAt });
  }
  return [...byId.values()].sort((a, b) => a.createdAt - b.createdAt);
}

/**
 * Прогресс цели: лучший поднятый вес по упражнению против целевого.
 * «Свой вес» (weight=0) рекордом не считается. Достигнута — best >= target.
 */
export function evaluateExerciseGoal(
  setLogs: readonly GoalSetLog[],
  goal: Pick<ExerciseGoal, 'exerciseId' | 'targetWeightKg'>
): GoalProgress {
  let bestWeightKg = 0;
  let bestDateKey: string | null = null;
  for (const s of setLogs) {
    if (s.exerciseId === goal.exerciseId && s.weight > bestWeightKg) {
      bestWeightKg = s.weight;
      bestDateKey = s.dateKey;
    }
  }
  return {
    exerciseId: goal.exerciseId,
    targetWeightKg: goal.targetWeightKg,
    bestWeightKg,
    bestDateKey,
    progressPct: bestWeightKg > 0 ? Math.min(1, bestWeightKg / goal.targetWeightKg) : 0,
    remainingKg: round1(Math.max(0, goal.targetWeightKg - bestWeightKg)),
    reached: bestWeightKg >= goal.targetWeightKg
  };
}
