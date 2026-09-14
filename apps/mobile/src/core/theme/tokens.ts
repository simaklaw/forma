/**
 * Design tokens ported 1:1 from fitpulse-redesign.html's CSS custom properties.
 * Keep this file as the single source of truth for color/spacing/type so the
 * native app doesn't drift from the "sports protocol / scoreboard" identity
 * established in the prototype (see that file's <style> :root block).
 */

export const colors = {
  ink: '#0B0E10',
  panel: '#14181B',
  panelRaised: '#191E22',
  line: 'rgba(244,241,234,0.09)',
  lineStrong: 'rgba(244,241,234,0.18)',

  paper: '#F4F1EA',
  paperDim: 'rgba(244,241,234,0.56)',
  paperFaint: 'rgba(244,241,234,0.28)',

  lime: '#D6FF3F',
  limeDim: 'rgba(214,255,63,0.16)',
  ember: '#FF6A39',
  cyan: '#6FE7D3'
} as const;

export const radius = {
  card: 4
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
 * Barlow Condensed is used for all numeric/headline type in the prototype
 * (scoreboard feel). Load it via expo-font in App.tsx:
 *   BarlowCondensed_700Bold, BarlowCondensed_600SemiBold
 * from the @expo-google-fonts/barlow-condensed package (add to package.json
 * if not already present).
 */
export const fonts = {
  mono: 'BarlowCondensed_700Bold',
  monoSemi: 'BarlowCondensed_600SemiBold',
  body: 'Inter_400Regular',
  bodySemi: 'Inter_600SemiBold'
} as const;

export const theme = { colors, radius, spacing, fonts };
export type Theme = typeof theme;
