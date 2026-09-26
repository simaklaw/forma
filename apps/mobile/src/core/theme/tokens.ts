/**
 * FitPulse design tokens — dual theme (dark ink / light sport).
 *
 * Brand:
 *   primary mint  #00E5A8
 *   secondary     #00B894
 *   ink           #0B0F14
 *   paper         #F8FAFC
 *
 * `colors` stays the **dark** palette for backward-compatible static imports.
 * Prefer `useThemeColors()` / `resolveColors(mode)` for new UI.
 */

export type ThemeMode = 'dark' | 'light';

export type ColorTokens = {
  ink: string;
  panel: string;
  panelRaised: string;
  line: string;
  lineStrong: string;
  paper: string;
  paperDim: string;
  paperFaint: string;
  lime: string;
  limeDim: string;
  mint: string;
  ember: string;
  cyan: string;
  macroProtein: string;
  macroFat: string;
  macroCarb: string;
};

/** Dark — current production look */
export const darkColors: ColorTokens = {
  ink: '#0B0F14',
  panel: '#121820',
  panelRaised: '#182028',
  line: 'rgba(248,250,252,0.08)',
  lineStrong: 'rgba(248,250,252,0.16)',
  paper: '#F8FAFC',
  paperDim: 'rgba(248,250,252,0.62)',
  paperFaint: 'rgba(248,250,252,0.38)',
  lime: '#00E5A8',
  limeDim: 'rgba(0,229,168,0.14)',
  mint: '#00B894',
  ember: '#FF6A39',
  cyan: '#2DD4BF',
  macroProtein: '#00E5A8',
  macroFat: '#F59E0B',
  macroCarb: '#38BDF8'
};

/** Light sports — airy paper, mint CTAs, strong readable text */
export const lightColors: ColorTokens = {
  ink: '#F4F7F5',
  panel: '#FFFFFF',
  panelRaised: '#E8F0EC',
  line: 'rgba(11,15,20,0.08)',
  lineStrong: 'rgba(11,15,20,0.16)',
  paper: '#0B0F14',
  paperDim: 'rgba(11,15,20,0.68)',
  paperFaint: 'rgba(11,15,20,0.42)',
  lime: '#00B894',
  limeDim: 'rgba(0,184,148,0.12)',
  mint: '#00E5A8',
  ember: '#E85A2B',
  cyan: '#0D9488',
  macroProtein: '#00B894',
  macroFat: '#D97706',
  macroCarb: '#0284C7'
};

/** @deprecated Prefer resolveColors / useThemeColors — alias of dark for legacy imports */
export const colors = darkColors;

export function resolveColors(mode: ThemeMode): ColorTokens {
  return mode === 'light' ? lightColors : darkColors;
}

export const radius = {
  card: 16,
  pill: 999,
  control: 12,
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

export const theme = { colors, radius, spacing, fonts };
export type Theme = typeof theme;
