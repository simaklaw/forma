/**
 * MD3-фаза 2: чистые фабрики стилей базовых компонентов (Material 3).
 *
 * Файл без React/RN-рантайм-импортов (типы RN — только type-only), поэтому
 * контракт тестируется jest'ом напрямую: тональные поверхности вместо
 * поголовных бордеров, primaryContainer для выбранных чипов и tonal-кнопок,
 * filled/tonal/outlined-кнопки, текст — якоря typeScale.
 * Экраны переводятся на Md3Card/Md3Chip/Md3Button в фазе 3.
 */
import type { TextStyle, ViewStyle } from 'react-native';
import { radius, spacing, typeScale, type ColorTokens } from '@/core/theme/tokens';

export type Md3SurfaceVariant = 'flat' | 'raised' | 'outlined';
export type Md3CardPadding = 'none' | 'sm' | 'md' | 'lg';
export type Md3RadiusKey = 'card' | 'cardXl';
export type Md3ChipVariant = 'assist' | 'filter' | 'status';
export type Md3ButtonVariant = 'filled' | 'tonal' | 'outlined';
export type Md3ButtonSize = 'sm' | 'md';

/**
 * Тональная поверхность карточки: flat = surfaceContainer, raised =
 * surfaceContainerHigh, outlined = рамка по line (fallback для legacy-вёрстки).
 */
export function md3Surface(
  colors: ColorTokens,
  variant: Md3SurfaceVariant = 'flat',
  radiusKey: Md3RadiusKey = 'card'
): ViewStyle {
  switch (variant) {
    case 'raised':
      return { borderRadius: radius[radiusKey], backgroundColor: colors.surfaceContainerHigh };
    case 'outlined':
      return {
        borderRadius: radius[radiusKey],
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: colors.line
      };
    default:
      return { borderRadius: radius[radiusKey], backgroundColor: colors.surfaceContainer };
  }
}

/** Внутренние отступы карточки — из шкалы spacing. */
export const md3CardPadding: Record<Md3CardPadding, ViewStyle> = {
  none: {},
  sm: { padding: spacing.sm },
  md: { padding: spacing.md },
  lg: { padding: spacing.lg }
};

export interface Md3ChipState {
  variant?: Md3ChipVariant;
  selected?: boolean;
  disabled?: boolean;
}

/** Поверхность чипа: filter-чип при выборе переезжает на primaryContainer. */
export function md3ChipSurface(colors: ColorTokens, state: Md3ChipState = {}): ViewStyle {
  const { variant = 'filter', selected = false, disabled = false } = state;
  const base: ViewStyle = {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingVertical: 5,
    paddingHorizontal: 12
  };
  if (disabled) {
    return { ...base, backgroundColor: colors.controlDisabled };
  }
  if (variant === 'assist' || (variant === 'filter' && !selected)) {
    return { ...base, backgroundColor: colors.surfaceContainer };
  }
  return { ...base, backgroundColor: colors.primaryContainer };
}

/** Текст чипа — якорь labelMedium; цвет по роли состояния. */
export function md3ChipLabel(colors: ColorTokens, state: Md3ChipState = {}): TextStyle {
  const { variant = 'filter', selected = false, disabled = false } = state;
  const base: TextStyle = { ...typeScale.labelMedium };
  if (disabled) {
    return { ...base, color: colors.controlDisabledText };
  }
  if (variant === 'assist') {
    return { ...base, color: colors.paperDim };
  }
  if (variant === 'filter' && !selected) {
    return { ...base, color: colors.paper };
  }
  return { ...base, color: colors.onPrimaryContainer };
}

export interface Md3ButtonState {
  variant?: Md3ButtonVariant;
  size?: Md3ButtonSize;
  disabled?: boolean;
}

/** Поверхность кнопки: filled (CTA) / tonal (primaryContainer) / outlined. */
export function md3ButtonSurface(colors: ColorTokens, state: Md3ButtonState = {}): ViewStyle {
  const { variant = 'filled', size = 'md', disabled = false } = state;
  const base: ViewStyle = {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: size === 'sm' ? radius.control : radius.btn,
    paddingVertical: size === 'sm' ? spacing.sm : spacing.md,
    paddingHorizontal: size === 'sm' ? spacing.lg : spacing.xxl
  };
  if (disabled) {
    const bg = variant === 'outlined' ? 'transparent' : colors.controlDisabled;
    return { ...base, backgroundColor: bg };
  }
  switch (variant) {
    case 'tonal':
      return { ...base, backgroundColor: colors.primaryContainer };
    case 'outlined':
      return {
        ...base,
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: colors.lineStrong
      };
    default:
      return { ...base, backgroundColor: colors.lime };
  }
}

/** Текст кнопки — якоря typeScale (md = titleMedium, sm = labelMedium). */
export function md3ButtonLabel(colors: ColorTokens, state: Md3ButtonState = {}): TextStyle {
  const { variant = 'filled', size = 'sm', disabled = false } = state;
  const base: TextStyle = { ...(size === 'sm' ? typeScale.labelMedium : typeScale.titleMedium) };
  if (disabled) {
    return { ...base, color: colors.controlDisabledText };
  }
  switch (variant) {
    case 'tonal':
      return { ...base, color: colors.onPrimaryContainer };
    case 'outlined':
      return { ...base, color: colors.paper };
    default:
      return { ...base, color: colors.onAccent };
  }
}
