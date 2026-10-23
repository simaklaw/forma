/** Пользовательское подключение к любой OpenAI-совместимой платформе (BYOK). */
export interface AiProviderConfig {
  id: string;
  /** Человекочитаемое имя подключения. */
  label: string;
  /** База платформы, например https://api.openai.com/v1 или https://openrouter.ai/api/v1. */
  baseUrl: string;
  apiKey: string;
  model: string;
  /** Модель принимает изображения (vision) — нужен для анализа фото блюд. */
  supportsVision: boolean;
}

export type AiRoleId = 'assistant' | 'nutritionist' | 'coach';

/** Сообщение диалога. Фото к сообщению не персистятся (см. AiImageAttachment). */
export interface AiChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** Фото пользователя для vision-запроса: base64 без префикса data:. Живёт только в момент вызова. */
export interface AiImageAttachment {
  base64: string;
  mimeType: string;
}

export interface AiConversation {
  /** `${roleId}:${scope}` — например `nutritionist:nutrition-day`. */
  key: string;
  /** Хеш бизнес-контекста: пока данные не изменились, повторный анализ не вызывается. */
  contextHash: string;
  messages: AiChatMessage[];
  totalTokens: number;
  updatedAt: number;
}
