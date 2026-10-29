/**
 * Контракт MD3-фазы 2: базовые компоненты сидят на M3-ролях.
 * Тональные поверхности — без бордеров; выбранный чип = primaryContainer;
 * кнопки filled/tonal/outlined; текст — якоря typeScale. Обе палитры.
 */
import { darkColors, lightColors, radius, typeScale, type ColorTokens } from '@/core/theme/tokens';
import {
  md3Surface,
  md3ChipSurface,
  md3ChipLabel,
  md3ButtonSurface,
  md3ButtonLabel
} from './md3Surface';

describe.each([
  ['dark', darkColors],
  ['light', lightColors]
])('MD3 фаза 2: %s палитра', (_name, c: ColorTokens) => {
  test('карточка flat/raised — тональные поверхности без рамки', () => {
    expect(md3Surface(c, 'flat')).toMatchObject({
      backgroundColor: c.surfaceContainer,
      borderRadius: radius.card
    });
    expect(md3Surface(c, 'raised')).toMatchObject({
      backgroundColor: c.surfaceContainerHigh,
      borderRadius: radius.card
    });
    expect(md3Surface(c, 'flat').borderWidth).toBeUndefined();
    expect(md3Surface(c, 'raised').borderWidth).toBeUndefined();
  });

  test('карточка outlined — рамка по line, радиусы из шкалы', () => {
    expect(md3Surface(c, 'outlined')).toMatchObject({
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: radius.card
    });
    expect(md3Surface(c, 'flat', 'cardXl')).toMatchObject({ borderRadius: radius.cardXl });
  });

  test('чип filter: обычный — surfaceContainer, выбранный — primaryContainer', () => {
    expect(md3ChipSurface(c, { variant: 'filter' })).toMatchObject({
      backgroundColor: c.surfaceContainer,
      borderRadius: radius.pill
    });
    expect(md3ChipSurface(c, { variant: 'filter', selected: true })).toMatchObject({
      backgroundColor: c.primaryContainer
    });
    expect(md3ChipSurface(c, { variant: 'filter' }).borderWidth).toBeUndefined();
    expect(md3ChipLabel(c, { variant: 'filter' })).toMatchObject({ color: c.paper });
    expect(md3ChipLabel(c, { variant: 'filter', selected: true })).toMatchObject({
      color: c.onPrimaryContainer
    });
  });

  test('чип assist/status — роли без рамок', () => {
    expect(md3ChipSurface(c, { variant: 'assist' }).backgroundColor).toBe(c.surfaceContainer);
    expect(md3ChipSurface(c, { variant: 'status' }).backgroundColor).toBe(c.primaryContainer);
    expect(md3ChipSurface(c, { variant: 'status' }).borderWidth).toBeUndefined();
    expect(md3ChipLabel(c, { variant: 'assist' }).color).toBe(c.paperDim);
    expect(md3ChipLabel(c, { variant: 'status' }).color).toBe(c.onPrimaryContainer);
  });

  test('чип disabled — пара controlDisabled', () => {
    expect(md3ChipSurface(c, { disabled: true }).backgroundColor).toBe(c.controlDisabled);
    expect(md3ChipLabel(c, { disabled: true }).color).toBe(c.controlDisabledText);
  });

  test('чип-текст — якорь labelMedium', () => {
    expect(md3ChipLabel(c)).toMatchObject({
      fontFamily: typeScale.labelMedium.fontFamily,
      fontSize: typeScale.labelMedium.fontSize,
      lineHeight: typeScale.labelMedium.lineHeight
    });
  });

  test('кнопка filled — лайм-CTA на onAccent, радиус btn', () => {
    expect(md3ButtonSurface(c)).toMatchObject({
      backgroundColor: c.lime,
      borderRadius: radius.btn
    });
    expect(md3ButtonSurface(c).borderWidth).toBeUndefined();
    expect(md3ButtonLabel(c, { size: 'md' })).toMatchObject({
      color: c.onAccent,
      fontFamily: typeScale.titleMedium.fontFamily
    });
  });

  test('кнопка tonal — пара primaryContainer без рамки', () => {
    expect(md3ButtonSurface(c, { variant: 'tonal' })).toMatchObject({
      backgroundColor: c.primaryContainer,
      borderRadius: radius.btn
    });
    expect(md3ButtonSurface(c, { variant: 'tonal' }).borderWidth).toBeUndefined();
    expect(md3ButtonLabel(c, { variant: 'tonal', size: 'md' })).toMatchObject({
      color: c.onPrimaryContainer
    });
  });

  test('кнопка outlined — рамка lineStrong, текст paper', () => {
    expect(md3ButtonSurface(c, { variant: 'outlined' })).toMatchObject({
      borderWidth: 1,
      borderColor: c.lineStrong
    });
    expect(md3ButtonLabel(c, { variant: 'outlined', size: 'md' })).toMatchObject({
      color: c.paper
    });
  });

  test('кнопка disabled — пара controlDisabled', () => {
    expect(md3ButtonSurface(c, { disabled: true }).backgroundColor).toBe(c.controlDisabled);
    expect(md3ButtonLabel(c, { disabled: true, size: 'md' }).color).toBe(c.controlDisabledText);
  });
});
