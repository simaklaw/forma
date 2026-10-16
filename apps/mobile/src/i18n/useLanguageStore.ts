import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Language = 'ru' | 'en';

type LanguageState = {
  lang: Language;
  setLang: (lang: Language) => void;
};

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      lang: 'ru',
      setLang: (lang) => set({ lang })
    }),
    {
      name: 'fitpulse_lang_v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ lang: s.lang })
    }
  )
);
