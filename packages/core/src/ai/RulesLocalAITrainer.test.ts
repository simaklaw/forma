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

  it("answers sleep chip without medical claims", async () => {
    const trainer = new RulesLocalAITrainer();
    const text = await trainer.generateAdvice(context, "Сон и восстановление");
    assert.match(text, /7–9/);
    assert.match(text, /сон/i);
    assert.equal(text.includes("диагноз"), false);
  });

  it("answers water chip with nutrition tab hint", async () => {
    const trainer = new RulesLocalAITrainer();
    const text = await trainer.generateAdvice(context, "Вода сегодня");
    assert.match(text, /Питание/);
    assert.match(text, /стакан/i);
  });

  it("does not route unrelated words to sleep, water, or home advice", async () => {
    const trainer = new RulesLocalAITrainer();
    const expected = await trainer.generateAdvice(context, "совет");
    for (const prompt of ["персональный совет", "подводный", "углеводы", "домино", "watermelon", "sleepy"]) {
      assert.equal(await trainer.generateAdvice(context, prompt), expected, prompt);
    }
  });

  it("recognizes full words with punctuation and Cyrillic endings", async () => {
    const trainer = new RulesLocalAITrainer();
    assert.match(await trainer.generateAdvice(context, "Как улучшить сон?"), /7–9/);
    assert.match(await trainer.generateAdvice(context, "Сколько воды?"), /стакан/);
    assert.match(await trainer.generateAdvice({ ...context, lastWorkout: undefined }, "Дома!"), /Зал или Дом/);
  });

  it("answers recovery with and without a workout before calorie fallback", async () => {
    const trainer = new RulesLocalAITrainer();
    const deficit = { ...context, dailyMetrics: { ...context.dailyMetrics, consumedCalories: 1000 } };
    const withWorkout = await trainer.generateAdvice(deficit, " Восстановление ");
    assert.match(withWorkout, /Full body/);
    assert.match(withWorkout, /RPE 7/);
    const withoutWorkout = await trainer.generateAdvice({ ...deficit, lastWorkout: undefined }, "Восстановление");
    assert.match(withoutWorkout, /нет завершённой тренировки/);
    assert.doesNotMatch(withoutWorkout, /Дефицит/);
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
