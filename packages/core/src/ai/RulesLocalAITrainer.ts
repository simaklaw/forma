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

  if (q.includes("калор") || q.includes("кбжу") || q.includes("калори")) {
    return `Цель ${ctx.dailyMetrics.targetCalories} ккал, съедено ${ctx.dailyMetrics.consumedCalories}, сожжено ${burned}. Дельта ${delta > 0 ? "+" : ""}${delta}.`;
  }

  // Coach chips: «Сон и восстановление»
  if (q.includes("сон") || q.includes("sleep")) {
    return "Ориентир 7–9 часов сна. После тяжёлого дня приоритет — сон и белок, а не ещё одна «добивающая» сессия. Это не медицинский совет, а привычка под восстановление.";
  }

  // Coach chips: «Вода сегодня»
  if (q.includes("вод") || q.includes("water") || q.includes("гидрат")) {
    return "Отмечай стаканы во вкладке «Питание». Жажда часто маскируется под голод между приёмами. После тренировки — вода раньше, чем сладкий напиток «за восстановление».";
  }

  if (ctx.lastWorkout && (q.includes("трен") || q.includes("workout") || q.includes("восстан"))) {
    return `«${ctx.lastWorkout.name}» уже в логе (RPE ${ctx.lastWorkout.rpeScore}). Сегодня — белок, вода и сон. Нет смысла добивать ещё один тяжёлый блок.`;
  }

  if (q.includes("трен") || q.includes("зал") || q.includes("дом")) {
    if (ctx.lastWorkout) {
      return `Сессия «${ctx.lastWorkout.name}» уже закрыта. Завтра — следующий день плана, сегодня достаточно восстановления.`;
    }
    return "Открой вкладку Тренировки, выбери Зал или Дом и жми старт. Подходы идут строго по порядку плана.";
  }

  // «Как накачаться / набрать массу» — до численного фолбэка по дельте
  if (q.includes("накачат") || q.includes("масс") || q.includes("мышц")) {
    return (
      `Рост мышц — это профицит калорий (~+300 ккал к цели) и белок ~2 г/кг, ` +
      `а не героизм в зале. Сейчас цель ${ctx.dailyMetrics.targetCalories} ккал, ` +
      `съедено ${ctx.dailyMetrics.consumedCalories}. Если цель — набор массы, ` +
      `подними целевые калории в профиле, не просто ешь больше на глаз.`
    );
  }

  // «Как убрать живот / жир с живота» — local fat reduction is a myth
  if (q.includes("живот") || q.includes("пресс") || q.includes("жир")) {
    return (
      `Локально «сжечь» живот нельзя — это миф. Дефицит калорий + белок + ` +
      `регулярные тренировки. Планка укрепляет кор, но жир уходит с ` +
      `всего тела. Цель ${ctx.dailyMetrics.targetCalories} ккал, ` +
      `сейчас ${ctx.dailyMetrics.consumedCalories}.`
    );
  }

  // «Как похудеть / сбросить вес» — before numerical calorie fallback
  if (
    q.includes("похуд") ||
    q.includes("сброс") ||
    q.includes("сбросить") ||
    q.includes("убрать вес") ||
    q.includes("lose weight")
  ) {
    const proteinHint =
      proteinLeft > 0
        ? ` До белка ещё ~${proteinLeft} г — без этого при сильном дефиците теряешь мышцы.`
        : " Белок на сегодня уже закрыт — держи этот уровень.";
    return (
      `Похудение = устойчивый дефицит (~300–500 ккал), а не голод на ${Math.abs(delta)} ккал. ` +
      `Цель ${ctx.dailyMetrics.targetCalories} ккал, съедено ${ctx.dailyMetrics.consumedCalories}.` +
      proteinHint +
      ` Закрой день тренировкой или прогулкой и не режь калории ещё сильнее.`
    );
  }

  // Coach chips: «Мой прогресс за неделю»
  if (q.includes("прогресс") || q.includes("недел")) {
    if (ctx.lastWorkout) {
      return (
        `Последняя сессия «${ctx.lastWorkout.name}» в логе. ` +
        `За неделю смотри вкладку «Прогресс»: серия, дни плана и калории. ` +
        `Сегодня цель ${ctx.dailyMetrics.targetCalories} ккал, съедено ${ctx.dailyMetrics.consumedCalories}.`
      );
    }
    return (
      `Пока в журнале нет закрытых подходов — открой «Тренировки» и заверши день плана. ` +
      `Серия и статистика недели появятся после первой полной сессии.`
    );
  }

  // Coach chips: «Восстановление» (без слова «сон», чтобы не пересекаться с sleep-веткой)
  if (q.includes("восстанов")) {
    return (
      `Восстановление: сон 7–9 ч, белок и вода важнее «ещё одного жёсткого дня». ` +
      `Если усталость сильная — лёгкая ходьба вместо добивания. ` +
      `Сейчас белок ${Math.round(proteinConsumed)} / ${proteinTarget} г.`
    );
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
