import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { RulesLocalAITrainer } from "./RulesLocalAITrainer.ts";
import { buildTrainerSystemPrompt, type UserContextSnapshot } from "./ILocalAITrainer.ts";

const context: UserContextSnapshot = {
  userProfile: { weightKg: 80, heightCm: 180, age: 30, gender: "male" },
  dailyMetrics: {
    consumedCalories: 1800,
    targetCalories: 2000,
    burnedCalories: 300,
    proteinConsumed: 40,
    proteinTarget: 160,
  },
  lastWorkout: { name: "Full body", completedAt: "2026-09-16T10:00:00.000Z", rpeScore: 7 },
};

describe("RulesLocalAITrainer", () => {
  it("returns deterministic advice", async () => {
    const trainer = new RulesLocalAITrainer();
    const first = await trainer.generateAdvice(context, "что с белком?");
    const second = await trainer.generateAdvice(context, "что с белком?");

    assert.equal(first, second);
    assert.match(first, /120 г/);
    assert.match(first, /160 г/);
  });

  it("streams exactly the same content as generateAdvice", async () => {
    const trainer = new RulesLocalAITrainer();
    const expected = await trainer.generateAdvice(context, "что с белком?");
    let streamed = "";

    await trainer.streamAdvice(context, "что с белком?", (token) => {
      streamed += token;
    });

    assert.equal(streamed, expected);
  });

  it("initializes the rules fallback as ready without an LLM", async () => {
    const trainer = new RulesLocalAITrainer();
    let progress = 0;

    await trainer.initialize((ratio) => {
      progress = ratio;
    });

    assert.equal(progress, 1);
    assert.equal(trainer.isLlmReady?.() ?? false, false);
  });
});

describe("buildTrainerSystemPrompt", () => {
  it("uses a non-clinical role and explicit safety boundary", () => {
    const prompt = buildTrainerSystemPrompt(context);

    assert.match(prompt, /локальный фитнес-помощник Forma/);
    assert.equal(prompt.includes("тренер-диетолог"), false);
    assert.match(prompt, /без медицинских диагнозов и назначения лечения/);
    assert.match(prompt, /обратиться к специалисту/);
    assert.match(prompt, /Белок: 40 \/ 160/);
  });
});
