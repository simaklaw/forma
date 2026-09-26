/**
 * Unified on-device AI trainer port (report §4).
 * Mobile: llama.rn + GGUF. Web: Transformers.js / WebLLM + Web Worker.
 * Core never imports those libraries.
 */

export interface UserContextSnapshot {
  userProfile: {
    weightKg: number;
    heightCm: number;
    age: number;
    gender: "male" | "female";
  };
  dailyMetrics: {
    consumedCalories: number;
    targetCalories: number;
    burnedCalories: number;
    /** Optional macros — rules/LLM use when present. */
    proteinConsumed?: number;
    proteinTarget?: number;
  };
  lastWorkout?: {
    name: string;
    completedAt: string;
    rpeScore: number;
  };
}

export interface ILocalAITrainer {
  initialize(onProgress?: (ratio: number) => void): Promise<void>;
  generateAdvice(context: UserContextSnapshot, userPrompt: string): Promise<string>;
  streamAdvice(
    context: UserContextSnapshot,
    userPrompt: string,
    onToken: (token: string) => void,
  ): Promise<void>;
  /** True when a real LLM context/engine is loaded (not rules fallback). */
  isLlmReady?(): boolean;
}

export function calorieDelta(ctx: UserContextSnapshot): number {
  return ctx.dailyMetrics.consumedCalories - ctx.dailyMetrics.targetCalories;
}

/** System prompt shared by all platform LLM adapters. */
export function buildTrainerSystemPrompt(ctx: UserContextSnapshot): string {
  const { userProfile: p, dailyMetrics: d } = ctx;
  const delta = calorieDelta(ctx);
  const last = ctx.lastWorkout
    ? `Последняя тренировка: ${ctx.lastWorkout.name}, RPE ${ctx.lastWorkout.rpeScore}, ${ctx.lastWorkout.completedAt}.`
    : "Тренировок сегодня ещё нет.";
  const protein =
    d.proteinTarget != null
      ? ` Белок: ${Math.round(d.proteinConsumed ?? 0)} / ${Math.round(d.proteinTarget)} г.`
      : "";

  return [
    "Ты — локальный фитнес-помощник Forma. Отвечай кратко на русском, без медицинских диагнозов и назначения лечения.",
    `Профиль: ${p.gender === "male" ? "м" : "ж"}, ${p.age} лет, ${p.heightCm} см, ${p.weightKg} кг.`,
    `Сегодня: съедено ${d.consumedCalories} ккал из ${d.targetCalories}, сожжено ${d.burnedCalories}. Дельта: ${delta > 0 ? "+" : ""}${delta}.${protein}`,
    last,
    "Не выдумывай лабораторные данные. Если ситуация неясна — предложи один маленький безопасный шаг или посоветуй обратиться к специалисту.",
  ].join("\n");
}
