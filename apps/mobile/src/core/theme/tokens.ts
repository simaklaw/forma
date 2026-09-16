/**
 * FitPulse design tokens.
 *
 * Brand direction (logo sheet):
 *   primary mint  #00E5A8
 *   secondary     #00B894
 *   ink           #0B0F14
 *   panel         #121820
 *   muted         #6B7280
 *   paper         #F8FAFC
 *
 * `lime` is kept as the primary action accent alias so existing screens
 * keep working while the visual language shifts from protocol-neon to
 * premium fitness mint. No feature changes — colors / radius only.
 */

export const colors = {
  ink: '#0B0F14',
  panel: '#121820',
  panelRaised: '#182028',
  line: 'rgba(248,250,252,0.08)',
  lineStrong: 'rgba(248,250,252,0.16)',

  paper: '#F8FAFC',
  paperDim: 'rgba(248,250,252,0.62)',
  paperFaint: 'rgba(248,250,252,0.38)',

  /** Primary CTA / active nav — brand mint */
  lime: '#00E5A8',
  limeDim: 'rgba(0,229,168,0.14)',
  /** Secondary mint */
  mint: '#00B894',
  ember: '#FF6A39',
  cyan: '#2DD4BF',
  /** Macro legend dots (concept) */
  macroProtein: '#00E5A8',
  macroFat: '#F59E0B',
  macroCarb: '#38BDF8'
} as const;

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

/**
 * Barlow Condensed for numeric/headline type (scoreboard feel).
 * Inter for body. Loaded via expo-font in App.tsx.
 */
export const fonts = {
  mono: 'BarlowCondensed_700Bold',
  monoSemi: 'BarlowCondensed_600SemiBold',
  body: 'Inter_400Regular',
  bodySemi: 'Inter_600SemiBold'
} as const;

export const theme = { colors, radius, spacing, fonts };
export type Theme = typeof theme;
