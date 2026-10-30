import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { uuidv7 } from '@/features/workout/data/ids';
import type { AiChatMessage, AiConversation, AiProviderConfig } from './types';

/** Храним максимум столько диалогов, остальное прореживаем по времени. */
export const MAX_CONVERSATIONS = 12;

interface AiStore {
  providers: AiProviderConfig[];
  activeProviderId: string | null;
  conversations: Record<string, AiConversation>;
  upsertProvider: (provider: Omit<AiProviderConfig, 'id'> & { id?: string }) => AiProviderConfig;
  deleteProvider: (id: string) => void;
  setActiveProvider: (id: string) => void;
  /** Добавляет пару user/assistant; contextHash обновляется (анализ при изменениях данных). */
  appendTurn: (
    key: string,
    contextHash: string,
    user: AiChatMessage,
    assistant: AiChatMessage,
    totalTokens: number
  ) => void;
  clearConversation: (key: string) => void;
}

export interface AiStoreSnapshot {
  providers: AiProviderConfig[];
  activeProviderId: string | null;
}

export function selectActiveProvider(state: AiStoreSnapshot): AiProviderConfig | null {
  return state.providers.find((p) => p.id === state.activeProviderId) ?? null;
}

function pruneConversations(
  conversations: Record<string, AiConversation>
): Record<string, AiConversation> {
  const entries = Object.entries(conversations);
  if (entries.length <= MAX_CONVERSATIONS) return conversations;
  entries.sort((a, b) => a[1].updatedAt - b[1].updatedAt);
  const next: Record<string, AiConversation> = {};
  for (const [key, conversation] of entries.slice(entries.length - MAX_CONVERSATIONS)) {
    next[key] = conversation;
  }
  return next;
}

function mergePersistedAiState(persisted: unknown, current: AiStore): AiStore {
  const raw = (persisted ?? {}) as Partial<AiStore>;
  const providers = Array.isArray(raw.providers) ? raw.providers : current.providers;
  return {
    ...current,
    providers,
    activeProviderId:
      typeof raw.activeProviderId === 'string' &&
      providers.some((p) => p.id === raw.activeProviderId)
        ? raw.activeProviderId
        : current.activeProviderId,
    conversations:
      raw.conversations != null && typeof raw.conversations === 'object' && !Array.isArray(raw.conversations)
        ? (raw.conversations as Record<string, AiConversation>)
        : current.conversations
  };
}

/**
 * Приватность (ревью-находка #14): пользовательские API-ключи провайдеров
 * хранятся в AsyncStorage в открытом виде (persist-ключ `fitpulse_ai_state`).
 * Это осознанный компромисс BYO-модели: ключ принадлежит самому пользователю
 * и не открывает доступ к серверам приложения. Перенос в expo-secure-store —
 * возможное будущее улучшение (см. apps/mobile/README.md, «AI-ассистент и приватность»).
 */
export const useAiAssistantStore = create<AiStore>()(
  persist(
    (set, get) => ({
      providers: [],
      activeProviderId: null,
      conversations: {},

      upsertProvider: (provider) => {
        const created: AiProviderConfig = { ...provider, id: provider.id ?? uuidv7() };
        set((state) => {
          const exists = state.providers.some((p) => p.id === created.id);
          return {
            providers: exists
              ? state.providers.map((p) => (p.id === created.id ? created : p))
              : [...state.providers, created],
            activeProviderId: state.activeProviderId ?? created.id
          };
        });
        return created;
      },

      deleteProvider: (id) =>
        set((state) => {
          const providers = state.providers.filter((p) => p.id !== id);
          const activeProviderId =
            state.activeProviderId === id ? (providers[0]?.id ?? null) : state.activeProviderId;
          return { providers, activeProviderId };
        }),

      setActiveProvider: (id) => set({ activeProviderId: id }),

      appendTurn: (key, contextHash, user, assistant, totalTokens) =>
        set((state) => {
          const existing = state.conversations[key];
          const conversation: AiConversation = {
            key,
            contextHash,
            messages: [...(existing?.messages ?? []), user, assistant],
            totalTokens: (existing?.totalTokens ?? 0) + totalTokens,
            updatedAt: Date.now()
          };
          return {
            conversations: pruneConversations({ ...state.conversations, [key]: conversation })
          };
        }),

      clearConversation: (key) =>
        set((state) => {
          const conversations = { ...state.conversations };
          delete conversations[key];
          return { conversations };
        })
    }),
    {
      name: 'fitpulse_ai_state',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      merge: (persisted, current) => mergePersistedAiState(persisted, current)
    }
  )
);
