import { calorieDelta, type ILocalAITrainer, type UserContextSnapshot } from "./ILocalAITrainer";

/**
 * Always-on fallback trainer. No weights, no network.
 * llama.rn / WebLLM adapters replace this via CoachEngine / app wiring.
 */
export class RulesLocalAITrainer implements ILocalAITrainer {
  async initialize(onProgress?: (ratio: number) => void): Promise<void> {
    onProgress?.(1);
  }

  async generateAdvice(context: UserContextSnapshot, userPrompt: string): Promise<string> {
    return advise(context, userPrompt);
  }

  async streamAdvice(
    context: UserContextSnapshot,
    userPrompt: string,
    onToken: (token: string) => void,
  ): Promise<void> {
    const text = advise(context, userPrompt);
    const parts = text.split(/(\s+)/);
    for (const part of parts) {
      if (part) onToken(part);
    }
  }
}

function advise(ctx: UserContextSnapshot, userPrompt: string): string {
  const delta = calorieDelta(ctx);
  const burned = ctx.dailyMetrics.burnedCalories;
  const q = userPrompt.trim().toLowerCase();

  if (q.includes("белок") || q.includes("protein")) {
    const g = Math.round(ctx.userProfile.weightKg * 2);
    return `Ориентир — около ${g} г белка в сутки (≈ 2 г/кг). Размажь по приёмам, не в один ужин.`;
  }

  if (ctx.lastWorkout && (q.includes("трен") || q.includes("workout") || q.includes("восстан"))) {
    return `«${ctx.lastWorkout.name}» уже в логе (RPE ${ctx.lastWorkout.rpeScore}). Сегодня — белок, вода и сон. Нет смысла добивать ещё один тяжёлый блок.`;
  }

  if (delta > 250) {
    return `По калориям плюс ${delta}. До вечера — больше белка и овощей, меньше жидких калорий. Прогулка 20 минут лучше дополнительного подхода.`;
  }

  if (delta <= -400) {
    return `Дефицит около ${Math.abs(delta)} ккал. Это уже не «лёгкий режим». Добавь приём с белком — творог, яйца, рыба или бобы.`;
  }

  if (burned === 0) {
    return "По калориям день ровный. Короткая сессия или прогулка уже сдвинут день с места — героизм не обязателен.";
  }

  return `Цель ${ctx.dailyMetrics.targetCalories} ккал, сейчас ${ctx.dailyMetrics.consumedCalories}, тренировка дала ${burned}. Держи темп — сегодня этого достаточно.`;
}
