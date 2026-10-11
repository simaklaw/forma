/** voiceCuesEnabled slice — kept separate, same pattern as useTrainingModeStore. */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface VoiceCuesStore {
  enabled: boolean;
  setEnabled: (value: boolean) => void;
}

export const useVoiceCuesStore = create<VoiceCuesStore>()(
  persist(
    (set) => ({
      enabled: false, // off by default — don't surprise users with sudden speech
      setEnabled: (value) => set({ enabled: value })
    }),
    {
      name: 'fitpulse_voice_cues',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage)
    }
  )
);
