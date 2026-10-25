/**
 * voiceCues slice — kept separate, same pattern as useTrainingModeStore.
 * Гранулярные флаги «что озвучивать» (engines/voiceCueEvents.ts): можно
 * оставить, например, только напоминания об отдыхе и подходах.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_VOICE_CUE_FLAGS,
  normalizeVoiceCueFlags,
  type VoiceCueEvent
} from '@/engines/voiceCueEvents';

interface VoiceCuesStore {
  enabled: boolean;
  /** Какие события озвучиваются; действует только при enabled=true. */
  events: Record<VoiceCueEvent, boolean>;
  setEnabled: (value: boolean) => void;
  setEventEnabled: (event: VoiceCueEvent, value: boolean) => void;
}

/** Оборонительный merge: старые снапшоты без events получают дефолты. */
function mergeVoiceCuesState(persisted: unknown, current: VoiceCuesStore): VoiceCuesStore {
  const raw = (persisted ?? {}) as Partial<VoiceCuesStore>;
  return {
    ...current,
    enabled: typeof raw.enabled === 'boolean' ? raw.enabled : current.enabled,
    events: normalizeVoiceCueFlags(raw.events)
  };
}

export const useVoiceCuesStore = create<VoiceCuesStore>()(
  persist(
    (set) => ({
      enabled: false, // off by default — don't surprise users with sudden speech
      events: { ...DEFAULT_VOICE_CUE_FLAGS },
      setEnabled: (value) => set({ enabled: value }),
      setEventEnabled: (event, value) =>
        set((state) => ({ events: { ...state.events, [event]: value } }))
    }),
    {
      name: 'fitpulse_voice_cues',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      merge: (persisted, current) => mergeVoiceCuesState(persisted, current)
    }
  )
);
