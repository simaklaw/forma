import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ThemeMode } from '@/core/theme/tokens';

/**
 * Тема-состояние (issue #160): пользователь выбирает предпочтение
 * 'light' | 'dark' | 'system'. Эффективный режим (`mode`) вычисляется из
 * предпочтения и системной схемы: App.tsx слушает useColorScheme() и
 * пушит её в store через setSystemMode — мгновенное переключение на
 * всё приложение + персист через AsyncStorage (ключ прежний,
 * version 2 + migrate, у существующих пользователей режим сохраняется).
 */
export type ThemePreference = 'light' | 'dark' | 'system';

type ThemeState = {
  /** Что выбрал пользователь. */
  preference: ThemePreference;
  /** Схема устройства (обновляет App.tsx через useColorScheme). */
  systemMode: ThemeMode;
  /** Эффективный режим — его читают useThemeColors / App / StatusBar. */
  mode: ThemeMode;
  setPreference: (preference: ThemePreference) => void;
  setSystemMode: (mode: ThemeMode) => void;
  /** @deprecated Легаси-путь: жёстко задать режим (пинует предпочтение). */
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
};

function resolveMode(preference: ThemePreference, systemMode: ThemeMode): ThemeMode {
  return preference === 'system' ? systemMode : preference;
}

type PersistedTheme = Pick<ThemeState, 'preference' | 'systemMode' | 'mode'>;

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      preference: 'dark',
      systemMode: 'light',
      mode: 'dark',
      setPreference: (preference) =>
        set({ preference, mode: resolveMode(preference, get().systemMode) }),
      setSystemMode: (systemMode) =>
        set({ systemMode, mode: resolveMode(get().preference, systemMode) }),
      setMode: (mode) => set({ preference: mode, mode }),
      toggleMode: () => {
        const mode: ThemeMode = get().mode === 'dark' ? 'light' : 'dark';
        set({ preference: mode, mode });
      }
    }),
    {
      name: 'fitpulse_theme_v1',
      version: 2,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s): PersistedTheme => ({
        preference: s.preference,
        systemMode: s.systemMode,
        mode: s.mode
      }),
      migrate: (persisted, version): PersistedTheme => {
        const legacy = persisted as Partial<PersistedTheme> | undefined;
        // v1 хранил только { mode } — сохранённый режим становится предпочтением.
        const mode: ThemeMode = legacy?.mode === 'light' ? 'light' : 'dark';
        if (version < 2) {
          return { preference: mode, systemMode: 'light', mode };
        }
        return {
          preference: legacy?.preference ?? mode,
          systemMode: legacy?.systemMode ?? 'light',
          mode: legacy?.mode ?? mode
        };
      }
    }
  )
);
