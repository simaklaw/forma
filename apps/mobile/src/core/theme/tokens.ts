/**
 * FitPulse design tokens — dual theme.
 *
 * Dark «спортивный хронограф»: графит + lime + cyan + amber (production look).
 * Light «тёплый премиум / фарфор» (issue #160): самостоятельная система,
 * НЕ инверсия тёмной — фарфор #F7F5F0, карточки #FFFFFF, шалфей #E4EBE3,
 * CTA-акцент лесной #174C3B, чернильный текст #20251F, подписи тёплый камень.
 *
 * `colors` stays the **dark** palette for backward-compatible static imports.
 * Prefer `useThemeColors()` / `resolveColors(mode)` for new UI.
 *
 * Состав токенов (полный набор по issue #160):
 *   фон/поверхности  — ink (фон), panel (карточка), panelRaised (втор. блок), barSurface (таб-бар)
 *   текст            — paper (основной), paperDim (подписи), paperFaint (каптчены)
 *   бордеры          — line, lineStrong
 *   акценты          — lime (CTA) + limeDim, mint, cyan + cyanDim, ember, success/warning/danger
 *   состояния кнопок — onAccent (текст на CTA), accentPressed, surfacePressed,
 *                      controlDisabled / controlDisabledText
 *   прочее           — backdrop (скрим), макро-цвета
 */

export type ThemeMode = 'dark' | 'light';

export type ColorTokens = {
  /* фон и поверхности */
  ink: string;
  panel: string;
  panelRaised: string;
  barSurface: string;
  backdrop: string;
  /* текст */
  paper: string;
  paperDim: string;
  paperFaint: string;
  /* бордеры */
  line: string;
  lineStrong: string;
  /* акценты */
  lime: string;
  limeDim: string;
  mint: string;
  ember: string;
  cyan: string;
  cyanDim: string;
  success: string;
  warning: string;
  danger: string;
  /* макро-цвета */
  macroProtein: string;
  macroFat: string;
  macroCarb: string;
  /* M3-роли (миграция на Material 3, фаза 1 — аддитивно) */
  surfaceContainer: string;
  surfaceContainerHigh: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  /* состояния кнопок */
  onAccent: string;
  accentPressed: string;
  surfacePressed: string;
  controlDisabled: string;
  controlDisabledText: string;
};

/** Dark «спортивный хронограф» — current production look */
export const darkColors: ColorTokens = {
  ink: '#0B0F14',
  panel: '#121820',
  panelRaised: '#182028',
  barSurface: '#0B0F14',
  backdrop: 'rgba(0,0,0,0.50)',
  paper: '#F8FAFC',
  paperDim: 'rgba(248,250,252,0.62)',
  paperFaint: 'rgba(248,250,252,0.38)',
  line: 'rgba(248,250,252,0.08)',
  lineStrong: 'rgba(248,250,252,0.16)',
  lime: '#00E5A8',
  limeDim: 'rgba(0,229,168,0.14)',
  mint: '#00B894',
  ember: '#FF6A39',
  cyan: '#2DD4BF',
  cyanDim: 'rgba(45,212,191,0.10)',
  success: '#00E5A8',
  warning: '#F59E0B',
  danger: '#FF6A39',
  macroProtein: '#00E5A8',
  macroFat: '#F59E0B',
  macroCarb: '#38BDF8',
  onAccent: '#0B0F14',
  accentPressed: '#00C892',
  surfacePressed: 'rgba(248,250,252,0.06)',
  controlDisabled: 'rgba(248,250,252,0.08)',
  controlDisabledText: 'rgba(248,250,252,0.30)',
  surfaceContainer: '#151B23',
  surfaceContainerHigh: '#1B232E',
  primaryContainer: '#03392B',
  onPrimaryContainer: '#A9F5D6'
};

/**
 * Light «тёплый премиум» — фарфоровый фон, белые карточки, шалфейные
 * вторичные блоки, лесной CTA. Контраст пар проверяется тестом
 * themeContrast.test.ts (WCAG): paper/panel ≥ 7, paperDim ≥ 4.5,
 * paperFaint ≥ 3, акценты ≥ 4.5/3.
 */
export const lightColors: ColorTokens = {
  ink: '#F7F5F0',
  panel: '#FFFFFF',
  panelRaised: '#E4EBE3',
  barSurface: '#FFFFFF',
  backdrop: 'rgba(28,30,26,0.45)',
  paper: '#20251F',
  paperDim: '#5E6258',
  paperFaint: '#777A72',
  line: 'rgba(32,37,31,0.09)',
  lineStrong: 'rgba(32,37,31,0.16)',
  lime: '#174C3B',
  limeDim: 'rgba(23,76,59,0.10)',
  mint: '#2E6B52',
  ember: '#C2410C',
  cyan: '#0F766E',
  cyanDim: 'rgba(15,118,110,0.10)',
  success: '#1B7A4E',
  warning: '#A16207',
  danger: '#B42318',
  macroProtein: '#174C3B',
  macroFat: '#B45309',
  macroCarb: '#0369A1',
  onAccent: '#F7F5F0',
  accentPressed: '#0F3A2C',
  surfacePressed: 'rgba(32,37,31,0.06)',
  controlDisabled: 'rgba(32,37,31,0.08)',
  controlDisabledText: 'rgba(32,37,31,0.45)',
  surfaceContainer: '#FFFFFF',
  surfaceContainerHigh: '#F1EEE6',
  primaryContainer: '#BEEBD2',
  onPrimaryContainer: '#0B3D2E'
};

/** @deprecated Prefer resolveColors / useThemeColors — alias of dark for legacy imports */
export const colors = darkColors;

export function resolveColors(mode: ThemeMode): ColorTokens {
  return mode === 'light' ? lightColors : darkColors;
}

export const radius = {
  card: 16,
  cardXl: 24,
  pill: 999,
  control: 12,
  btn: 18,
  sheet: 22
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24
} as const;

export const fonts = {
  mono: 'BarlowCondensed_700Bold',
  monoSemi: 'BarlowCondensed_600SemiBold',
  body: 'Inter_400Regular',
  bodySemi: 'Inter_600SemiBold'
} as const;

/**
 * M3-шкала типов (фаза 1): якорные стили — display/headline/title/body/label.
 * Экраны переводятся на неё в фазах 2–3; значения заморожены контрактом
 * tokens.test.ts.
 */
export const typeScale = {
  displayLarge: { fontFamily: fonts.mono, fontSize: 40, lineHeight: 44 },
  headlineMedium: { fontFamily: fonts.mono, fontSize: 24, lineHeight: 30 },
  titleMedium: { fontFamily: fonts.bodySemi, fontSize: 15, lineHeight: 20 },
  bodyMedium: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
  labelMedium: { fontFamily: fonts.bodySemi, fontSize: 11, lineHeight: 14, letterSpacing: 0.6 }
} as const;

export const theme = { colors, radius, spacing, fonts };
export type Theme = typeof theme;
