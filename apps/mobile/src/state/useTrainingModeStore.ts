/** trainingMode slice — kept separate to avoid bloating main store merge. */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type TrainingMode = 'gym' | 'home';

interface TrainingModeStore {
  trainingMode: TrainingMode;
  setTrainingMode: (mode: TrainingMode) => void;
}

export const useTrainingModeStore = create<TrainingModeStore>()(
  persist(
    (set) => ({
      trainingMode: 'home',
      setTrainingMode: (mode) => set({ trainingMode: mode === 'home' ? 'home' : 'gym' })
    }),
    {
      name: 'fitpulse_training_mode',
      version: 1,
      // Soft-reset: anyone who still has 'gym' from before this change lands on home.
      migrate: (_persisted) => ({ trainingMode: 'home' as const }),
      storage: createJSONStorage(() => AsyncStorage)
    }
  )
);
