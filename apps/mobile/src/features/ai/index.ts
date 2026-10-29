export { useAiAssistantStore, selectActiveProvider, MAX_CONVERSATIONS } from './useAiAssistantStore';
export {
  AiClientError,
  chatCompletion,
  normalizeBaseUrl,
  testConnection,
  testVision,
  visionUserContent,
  MAX_VISION_IMAGES
} from './openAiClient';
export { AI_ROLES, roleById } from './roles';
export { AI_PROVIDER_PRESETS, providerPresetById, type AiProviderPreset } from './providerPresets';
export { buildNutritionDaySnapshot, renderNutritionContext } from './nutritionContext';
export { buildWorkoutDaySnapshot, renderWorkoutContext } from './workoutContext';
export { contextHash, stableStringify } from './contextHash';
export type {
  AiProviderConfig,
  AiRoleId,
  AiChatMessage,
  AiImageAttachment,
  AiConversation
} from './types';
export { default as AiCard } from './AiCard';
export { default as AiAssistantModal } from './AiAssistantModal';
