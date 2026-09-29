import { calorieDelta, type ILocalAITrainer, type UserContextSnapshot } from "./ILocalAITrainer.ts";

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
  const proteinTarget =
    ctx.dailyMetrics.proteinTarget ?? Math.round(ctx.userProfile.weightKg * 2);
  const proteinConsumed = ctx.dailyMetrics.proteinConsumed ?? 0;
  const proteinLeft = Math.max(0, Math.round(proteinTarget - proteinConsumed));

  if (q.includes("белк") || q.includes("protein") || q.includes("протеин")) {
    if (proteinLeft <= 0) {
      return `Белок на сегодня закрыт (~${Math.round(proteinConsumed)} г из ${proteinTarget} г). Дальше — вода и сон, не ещё один шейк ради цифры.`;
    }
    return `До белка ещё около ${proteinLeft} г (цель ~${proteinTarget} г, ≈ 2 г/кг). Размажь по приёмам: творог, яйца, рыба, курица — не в один ужин.`;
  }

  // The standalone workout recovery chip takes priority over calorie fallback.
  if (q === "восстановление") {
    if (ctx.lastWorkout) {
      return `«${ctx.lastWorkout.name}» уже в логе (RPE ${ctx.lastWorkout.rpeScore}). Сегодня — белок, вода и сон. Нет смысла добивать ещё один тяжёлый блок.`;
    }
    return "Пока нет завершённой тренировки в логе. Для восстановления начни со сна, воды и спокойной прогулки; нагрузку выбирай по самочувствию.";
  }

  if (q.includes("калор") || q.includes("кбжу") || q.includes("калори")) {
    return `Цель ${ctx.dailyMetrics.targetCalories} ккал, съедено ${ctx.dailyMetrics.consumedCalories}, сожжено ${burned}. Дельта ${delta > 0 ? "+" : ""}${delta}.`;
  }

  // Coach chips: «Сон и восстановление»
  if (/(?:^|[^\p{L}\p{N}_])(?:сон|сна|сну|сном|сне|sleep)(?=$|[^\p{L}\p{N}_])/u.test(q)) {
    return "Ориентир 7–9 часов сна. После тяжёлого дня приоритет — сон и белок, а не ещё одна «добивающая» сессия. Это не медицинский совет, а привычка под восстановление.";
  }

  // Coach chips: «Вода сегодня»
  if (/(?:^|[^\p{L}\p{N}_])(?:вода|воды|воде|воду|водой|water|гидратация|гидратации|гидратацию)(?=$|[^\p{L}\p{N}_])/u.test(q)) {
    return "Отмечай стаканы во вкладке «Питание». Жажда часто маскируется под голод между приёмами. После тренировки — вода раньше, чем сладкий напиток «за восстановление».";
  }

  if (ctx.lastWorkout && (q.includes("трен") || q.includes("workout") || q.includes("восстан"))) {
    return `«${ctx.lastWorkout.name}» уже в логе (RPE ${ctx.lastWorkout.rpeScore}). Сегодня — белок, вода и сон. Нет смысла добивать ещё один тяжёлый блок.`;
  }

  if (q.includes("трен") || q.includes("зал") || /(?:^|[^\p{L}\p{N}_])(?:дом|дома|дому|домом|доме)(?=$|[^\p{L}\p{N}_])/u.test(q)) {
    if (ctx.lastWorkout) {
      return `Сессия «${ctx.lastWorkout.name}» уже закрыта. Завтра — следующий день плана, сегодня достаточно восстановления.`;
    }
    return "Открой вкладку Тренировки, выбери Зал или Дом и жми старт. Подходы идут строго по порядку плана.";
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
