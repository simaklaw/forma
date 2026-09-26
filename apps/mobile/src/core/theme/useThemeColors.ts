import { resolveColors, type ColorTokens, type ThemeMode } from '@/core/theme/tokens';
import { useThemeStore } from '@/state/useThemeStore';

export function useThemeColors(): ColorTokens {
  const mode = useThemeStore((s) => s.mode);
  return resolveColors(mode);
}

export function useThemeMode(): ThemeMode {
  return useThemeStore((s) => s.mode);
}
