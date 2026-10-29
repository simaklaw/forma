/**
 * Сид-пресеты провайдеров ИИ (MD3 фаза 4.1): популярные OpenAI-совместимые
 * платформы с готовыми базовыми адресами и рекомендуемыми моделями.
 * Ключ остаётся пользовательским (BYOK) — пресет только подставляет адрес,
 * модель и vision-флаг в форму подключения AiAssistantModal.
 *
 * Чистый модуль без React/RN — контракт тестируется jest'ом напрямую.
 */

export interface AiProviderPreset {
  id: string;
  /** Человекочитаемое имя платформы для чипа пресета. */
  label: string;
  /** OpenAI-совместимый базовый адрес, оканчивающийся на /v1. */
  baseUrl: string;
  /** Рекомендуемые модели; первая подставляется в форму по умолчанию. */
  models: string[];
  /** Модели платформы принимают изображения — включаем vision по умолчанию. */
  supportsVision: boolean;
}

export const AI_PROVIDER_PRESETS: readonly AiProviderPreset[] = [
  {
    id: 'openai',
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4o-mini', 'gpt-4o', 'o3-mini'],
    supportsVision: true
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    supportsVision: false
  },
  {
    id: 'groq',
    label: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'],
    supportsVision: false
  },
  {
    id: 'mistral',
    label: 'Mistral',
    baseUrl: 'https://api.mistral.ai/v1',
    models: ['mistral-small-latest', 'mistral-large-latest'],
    supportsVision: false
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    models: ['openai/gpt-4o-mini', 'deepseek/deepseek-chat', 'google/gemini-2.0-flash-001'],
    supportsVision: true
  }
];

/** Пресет по id чипа; null для неизвестного id. */
export function providerPresetById(id: string): AiProviderPreset | null {
  return AI_PROVIDER_PRESETS.find((preset) => preset.id === id) ?? null;
}
