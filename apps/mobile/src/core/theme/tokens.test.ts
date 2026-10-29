/**
 * Контракт MD3-фазы 1 (миграция на Material 3).
 * Новые роли поверхностей/primaryContainer присутствуют в обеих палитрах
 * и покрыты WCAG-парами в themeContrast.test.ts. Шкала форм и типов
 * заморожена: фазы 2–3 переводят экраны на эти значения.
 */
import { darkColors, lightColors, radius, typeScale } from './tokens';

describe.each([
  ['dark', darkColors],
  ['light', lightColors]
])('MD3 фаза 1: %s палитра', (_name, palette) => {
  test('содержит M3-роли: тональные поверхности + primaryContainer', () => {
    expect(palette.surfaceContainer).toMatch(/^#[0-9a-f]{6}$/i);
    expect(palette.surfaceContainerHigh).toMatch(/^#[0-9a-f]{6}$/i);
    expect(palette.primaryContainer).toMatch(/^#[0-9a-f]{6}$/i);
    expect(palette.onPrimaryContainer).toMatch(/^#[0-9a-f]{6}$/i);
  });
});

describe('MD3 фаза 1: шкала форм', () => {
  test('радиусы образуют возрастающую шкалу M3', () => {
    expect(radius.cardXl).toBeGreaterThan(radius.card);
    expect(radius.card).toBeGreaterThan(radius.control);
    expect(radius.btn).toBeGreaterThan(radius.control);
    expect(radius.pill).toBeGreaterThan(radius.cardXl);
  });
});

describe('MD3 фаза 1: шкала типов', () => {
  test('якоря валидны: размер, интерлиньяж, семейство', () => {
    const styles = Object.values(typeScale);
    expect(styles.length).toBeGreaterThanOrEqual(5);
    for (const style of styles) {
      expect(style.fontSize).toBeGreaterThan(0);
      expect(style.lineHeight).toBeGreaterThanOrEqual(style.fontSize);
      expect(style.fontFamily.length).toBeGreaterThan(0);
    }
  });
});
