import type { CoachContext, CoachMessage, CoachProvider } from "./types";

/**
 * Deterministic local coach — zero network, zero model weights.
 * Used as default and as fallback when an LLM provider is unavailable.
 */
export class RulesCoach implements CoachProvider {
  readonly id = "rules";

  isReady(): boolean {
    return true;
  }

  async generate(ctx: CoachContext): Promise<CoachMessage> {
    return { text: coachLine(ctx), source: "rules" };
  }
}

export function coachLine(ctx: CoachContext): string {
  const first = ctx.name.trim().split(/\s+/)[0] || "друг";
  const tone = ctx.tone ?? "caring";

  if (ctx.protocolActive) {
    return tone === "direct"
      ? `${first}, протокол активен — держи калории на обслуживании.`
      : `${first}, сейчас мягкий протокол. Не режь калории — телу нужен отдых.`;
  }

  if (ctx.plateauSuspected) {
    return tone === "direct"
      ? `${first}, вес стоит. Проверь сон и белок, не вес на штанге.`
      : `${first}, вес почти не двигается. Это сигнал присмотреться к сну и белкам.`;
  }

  if (ctx.doneToday) {
    if (ctx.streak >= 5) {
      return `${first}, уже ${ctx.streak} дней подряд. Тело запоминает.`;
    }
    return `${first}, готово. Сегодня достаточно.`;
  }

  if (ctx.restDay) {
    return `${first}, сегодня отдых. Можно просто пройтись.`;
  }

  const goal = ctx.goalLabel.toLowerCase();
  if (goal.includes("силе") || goal.includes("strength") || goal.includes("gain")) {
    return `${first}, сила растёт от повторений, а не от героизма.`;
  }
  if (goal.includes("тонус") || goal.includes("tone") || goal.includes("recomp")) {
    return `${first}, лёгкое движение сегодня важнее идеальной формы.`;
  }
  if (goal.includes("восстанов") || goal.includes("recovery")) {
    return `${first}, мягко и без давления — этого достаточно.`;
  }
  if (goal.includes("энерг") || goal.includes("energy") || goal.includes("maintain")) {
    return `${first}, короткая сессия вернёт ясность.`;
  }

  return `${first}, маленький шаг сегодня важнее идеального плана.`;
}
