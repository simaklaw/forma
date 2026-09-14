import { RulesLocalAITrainer, calorieDelta, type UserContextSnapshot } from '@forma/core';

const base: UserContextSnapshot = {
  userProfile: { weightKg: 76, heightCm: 178, age: 26, gender: 'male' },
  dailyMetrics: { consumedCalories: 1800, targetCalories: 2200, burnedCalories: 0 }
};

describe('RulesLocalAITrainer', () => {
  const trainer = new RulesLocalAITrainer();

  it('flags a large deficit', async () => {
    const text = await trainer.generateAdvice(base, 'совет');
    expect(text.toLowerCase()).toMatch(/дефицит/);
  });

  it('flags a surplus', async () => {
    const text = await trainer.generateAdvice(
      { ...base, dailyMetrics: { consumedCalories: 2800, targetCalories: 2200, burnedCalories: 100 } },
      'совет'
    );
    expect(text).toMatch(/плюс/);
  });

  it('answers protein questions with g/kg', async () => {
    const text = await trainer.generateAdvice(base, 'сколько белка');
    expect(text).toMatch(/152/);
  });

  it('streams tokens that reassemble the full advice', async () => {
    let acc = '';
    await trainer.streamAdvice(base, 'совет', (t) => {
      acc += t;
    });
    const full = await trainer.generateAdvice(base, 'совет');
    expect(acc).toBe(full);
  });
});

describe('calorieDelta', () => {
  it('is consumed minus target', () => {
    expect(calorieDelta(base)).toBe(-400);
  });
});
