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

  it("answers a muscle-gain question instead of the generic calorie fallback", async () => {
    const trainer = new RulesLocalAITrainer();
    const text = await trainer.generateAdvice(context, "Я худой, как мне накачаться?");
    assert.match(text, /профицит/i);
    assert.match(text, /белок/i);
    assert.match(text, /2 г\/кг/);
  });

  it("debunks spot reduction for a belly-fat question", async () => {
    const trainer = new RulesLocalAITrainer();
    const text = await trainer.generateAdvice(context, "Как убрать живот?");
    assert.match(text, /миф/i);
    assert.match(text, /дефицит/i);
  });

  it("answers a weight-loss question with a dedicated reply, not the calorie fallback", async () => {
    const trainer = new RulesLocalAITrainer();
    const text = await trainer.generateAdvice(context, "Как похудеть?");
    assert.match(text, /дефицит/i);
    assert.match(text, /белк/i);
    assert.doesNotMatch(text, /Держи темп/); // не должен быть тем же текстом, что и generic-фолбэк
  });

  it("gives a different reply to a second, distinct question in the same session", async () => {
    const trainer = new RulesLocalAITrainer();
    const first = await trainer.generateAdvice(context, "Дай совет на сегодня");
    const second = await trainer.generateAdvice(context, "Как похудеть?");
    assert.notStrictEqual(first, second);
  });

  it("answers progress chip without only repeating calorie-delta fallback", async () => {
    const trainer = new RulesLocalAITrainer();
    const text = await trainer.generateAdvice(context, "Мой прогресс за неделю");
    assert.match(text, /Прогресс|сесс/i);
  });

  it("still falls back to the calorie-delta reply for a truly generic message", async () => {
    const trainer = new RulesLocalAITrainer();
    const text = await trainer.generateAdvice(context, "как у меня дела сегодня?");
    assert.match(text, /Цель/);
    assert.equal(text.includes("профицит"), false);
    assert.equal(text.includes("миф"), false);
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
