import { describe, expect, it } from "node:test";
import { RulesLocalAITrainer } from "./RulesLocalAITrainer";
import { buildTrainerSystemPrompt, type UserContextSnapshot } from "./ILocalAITrainer";

const context: UserContextSnapshot = {
  userProfile: { weightKg: 80, heightCm: 180, age: 30, gender: "male" },
  dailyMetrics: { consumedCalories: 1800, targetCalories: 2000, burnedCalories: 300 },
  lastWorkout: { name: "Full body", completedAt: "2026-09-16T10:00:00.000Z", rpeScore: 7 },
};

describe("RulesLocalAITrainer", () => {
  it("returns deterministic advice", async () => {
    const trainer = new RulesLocalAITrainer();
    const first = await trainer.generateAdvice(context, "что с белком?");
    const second = await trainer.generateAdvice(context, "что с белком?");

    expect(first).toBe(second);
    expect(first).toContain("160 г белка");
  });

  it("streams exactly the same content as generateAdvice", async () => {
    const trainer = new RulesLocalAITrainer();
    const expected = await trainer.generateAdvice(context, "что с белком?");
    let streamed = "";

    await trainer.streamAdvice(context, "что с белком?", (token) => {
      streamed += token;
    });

    expect(streamed).toBe(expected);
  });

  it("initializes the rules fallback as ready without an LLM", async () => {
    const trainer = new RulesLocalAITrainer();
    let progress = 0;

    await trainer.initialize((ratio) => {
      progress = ratio;
    });

    expect(progress).toBe(1);
    expect(trainer.isLlmReady?.() ?? false).toBe(false);
  });
});

describe("buildTrainerSystemPrompt", () => {
  it("uses a non-clinical role and explicit safety boundary", () => {
    const prompt = buildTrainerSystemPrompt(context);

    expect(prompt).toContain("локальный фитнес-помощник Forma");
    expect(prompt).not.toContain("тренер-диетолог");
    expect(prompt).toContain("без медицинских диагнозов и назначения лечения");
    expect(prompt).toContain("обратиться к специалисту");
  });
});
