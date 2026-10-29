/**
 * Тесты сканера этикетки: извлечение JSON из ответа vision-модели
 * и клампинг БЖУ на 100 г.
 */
import { extractJsonCandidate, parseLabelAnswer, LABEL_SCAN_PROMPT } from './labelScan';

describe('extractJsonCandidate', () => {
  it('чистый JSON без обёртки', () => {
    expect(extractJsonCandidate('{"kcal": 157}')).toBe('{"kcal": 157}');
  });

  it('markdown-фенс вокруг JSON', () => {
    const raw = 'Вот таблица:\n\`\`\`json\n{"kcal": 100, "protein": 5}\n\`\`\`\nСпасибо!';
    expect(extractJsonCandidate(raw)).toBe('{"kcal": 100, "protein": 5}');
  });

  it('JSON внутри прозы', () => {
    const raw = 'Результат: {"kcal": 200, "protein": 10} — на 100 г';
    expect(extractJsonCandidate(raw)).toBe('{"kcal": 200, "protein": 10}');
  });

  it('без JSON — null', () => {
    expect(extractJsonCandidate('таблица нечитаема')).toBeNull();
    expect(extractJsonCandidate('')).toBeNull();
  });
});

describe('parseLabelAnswer', () => {
  it('полный JSON на 100 г', () => {
    const parsed = parseLabelAnswer('{"kcal": 157, "protein": 12.5, "fat": 3.2, "carbs": 21}');
    expect(parsed).toEqual({ kcal: 157, protein: 12.5, fat: 3.2, carbs: 21 });
  });

  it('фенс и проза вокруг', () => {
    const raw = '\`\`\`\n{"kcal": 248, "protein": 9.8, "fat": 12, "carbs": 28}\n\`\`\`';
    expect(parseLabelAnswer(raw)).toEqual({ kcal: 248, protein: 9.8, fat: 12, carbs: 28 });
  });

  it('синонимы ключей: calories/fats/carbohydrates', () => {
    const raw = '{"calories": 120, "protein": 4, "fats": 1.1, "carbohydrates": 21}';
    expect(parseLabelAnswer(raw)).toEqual({ kcal: 120, protein: 4, fat: 1.1, carbs: 21 });
  });

  it('числа строкой и с запятой вместо точки', () => {
    const raw = '{"kcal": "165", "protein": "31,0", "fat": "3.6", "carbs": "0"}';
    expect(parseLabelAnswer(raw)).toEqual({ kcal: 165, protein: 31, fat: 3.6, carbs: 0 });
  });

  it('клампит галлюцинации: kcal>900 и жир>100', () => {
    const raw = '{"kcal": 5000, "protein": 250, "fat": 120, "carbs": 60}';
    expect(parseLabelAnswer(raw)).toEqual({ kcal: 900, protein: 100, fat: 100, carbs: 60 });
  });

  it('error: true — модель не прочитала таблицу', () => {
    expect(parseLabelAnswer('{"error": true}')).toBeNull();
  });

  it('мусор вместо JSON — null', () => {
    expect(parseLabelAnswer('Извините, я не вижу таблицу')).toBeNull();
    expect(parseLabelAnswer('[1, 2, 3]')).toBeNull();
  });

  it('только kcal без макросов — null; kcal + белок — распознано', () => {
    expect(parseLabelAnswer('{"kcal": 200}')).toBeNull();
    expect(parseLabelAnswer('{"kcal": 200, "protein": 10}')).toEqual({
      kcal: 200,
      protein: 10,
      fat: 0,
      carbs: 0
    });
  });

  it('два макроса без kcal — распознано', () => {
    expect(parseLabelAnswer('{"protein": 8, "carbs": 30}')).toEqual({
      kcal: 0,
      protein: 8,
      fat: 0,
      carbs: 30
    });
  });

  it('промпт требует строгий JSON на 100 г', () => {
    expect(LABEL_SCAN_PROMPT).toContain('{"kcal": number, "protein": number, "fat": number, "carbs": number}');
    expect(LABEL_SCAN_PROMPT).toContain('PER 100 GRAMS');
  });
});
