/**
 * WCAG-контраст аудит обеих палитр (issue #160).
 *
 * Проверяются фактические пары «текст/фон», используемые в UI.
 * rgba-цвета композируются над своим реальным фоном (ink или panel).
 * Пороги:
 *   paper            ≥ 7   (основной текст, AAA)
 *   paperDim         ≥ 4.5 (подписи, AA)
 *   paperFaint       ≥ 3   (мелкие каптчены, AA large/декоративные)
 *   lime как текст   ≥ 4.5 (акцентные подписи, активные чипы)
 *   onAccent на lime ≥ 4.5 (текст на CTA-кнопке)
 *   ember/mint/macro ≥ 3   (крупные цифры, заливки диаграмм)
 *   cyan             ≥ 4.5 (мелкие подписи, жжёное кольцо)
 *   disabled         ≥ 2.5 (WCAG не требует, но фиксируем читаемость)
 */
import { darkColors, lightColors, type ColorTokens } from './tokens';

type RGB = readonly [number, number, number];

function parseColor(c: string): RGB {
  const hex = /^#([0-9a-f]{6})$/i.exec(c);
  if (hex) {
    return [
      parseInt(hex[1].slice(0, 2), 16),
      parseInt(hex[1].slice(2, 4), 16),
      parseInt(hex[1].slice(4, 6), 16)
    ];
  }
  const rgba = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(c);
  if (rgba) {
    return [Number(rgba[1]), Number(rgba[2]), Number(rgba[3])];
  }
  throw new Error(`Неизвестный формат цвета: ${c}`);
}

function colorAlpha(c: string): number {
  const m = /,\s*([\d.]+)\s*\)$/.exec(c);
  return m ? Number(m[1]) : 1;
}

/** rgba-текст композируется над реальным фоном компонента. */
function composite(fg: string, bg: string): RGB {
  const f = parseColor(fg);
  const b = parseColor(bg);
  const a = colorAlpha(fg);
  return [
    Math.round(f[0] * a + b[0] * (1 - a)),
    Math.round(f[1] * a + b[1] * (1 - a)),
    Math.round(f[2] * a + b[2] * (1 - a))
  ];
}

function relativeLuminance([r, g, b]: RGB): number {
  const ch = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

export function contrastRatio(fg: string, bg: string): number {
  const l1 = relativeLuminance(composite(fg, bg));
  const l2 = relativeLuminance(parseColor(bg));
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

type Check = readonly [label: string, fg: keyof ColorTokens, bg: keyof ColorTokens, min: number];

const CHECKS: readonly Check[] = [
  ['paper на ink (основной текст)', 'paper', 'ink', 7],
  ['paper на panel (текст в карточках)', 'paper', 'panel', 7],
  ['paper на panelRaised (шалфейный блок)', 'paper', 'panelRaised', 4.5],
  ['paper на surfaceContainer (M3-карточка без рамки)', 'paper', 'surfaceContainer', 7],
  ['paper на surfaceContainerHigh (M3-приподнятая карточка)', 'paper', 'surfaceContainerHigh', 7],
  ['paperDim на surfaceContainer (подписи на M3-поверхности)', 'paperDim', 'surfaceContainer', 4.5],
  ['onPrimaryContainer на primaryContainer (M3-чипы статусов)', 'onPrimaryContainer', 'primaryContainer', 4.5],
  ['paperDim на ink (подписи)', 'paperDim', 'ink', 4.5],
  ['paperDim на panel (подписи в карточках)', 'paperDim', 'panel', 4.5],
  ['paperFaint на ink (каптчены)', 'paperFaint', 'ink', 3],
  ['paperFaint на panel (каптчены в карточках)', 'paperFaint', 'panel', 3],
  ['lime на ink (акцент как текст)', 'lime', 'ink', 4.5],
  ['lime на panel (акцент в карточках)', 'lime', 'panel', 4.5],
  ['onAccent на lime (текст CTA)', 'onAccent', 'lime', 4.5],
  ['ember на panel (сверх бюджета)', 'ember', 'panel', 3],
  ['cyan на panel (жжёное кольцо, подписи)', 'cyan', 'panel', 4.5],
  ['cyan на ink (вода, чипы)', 'cyan', 'ink', 4.5],
  ['mint на panel (вторичный акцент)', 'mint', 'panel', 3],
  ['macroFat на panel (жиры, диаграмма)', 'macroFat', 'panel', 3],
  ['macroCarb на panel (углеводы, диаграмма)', 'macroCarb', 'panel', 3],
  ['controlDisabledText на ink (отключенный текст)', 'controlDisabledText', 'ink', 2.5]
];

describe.each([
  ['dark', darkColors],
  ['light', lightColors]
])('WCAG контраст: %s палитра', (_name, palette) => {
  test.each(CHECKS)('%s', (label, fg, bg, min) => {
    void label;
    const ratio = contrastRatio(palette[fg], palette[bg]);
    expect(ratio).toBeGreaterThanOrEqual(min);
  });

  test('все цветовые токены — валидные hex/rgba строки', () => {
    for (const value of Object.values(palette)) {
      expect(() => parseColor(value)).not.toThrow();
      expect(colorAlpha(value)).toBeGreaterThanOrEqual(0);
      expect(colorAlpha(value)).toBeLessThanOrEqual(1);
    }
  });
});
