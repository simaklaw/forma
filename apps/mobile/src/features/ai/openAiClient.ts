import type { AiImageAttachment, AiProviderConfig } from './types';

export const MAX_VISION_IMAGES = 4;
export const DEFAULT_TIMEOUT_MS = 60000;

/** Тестовое изображение 1×1 PNG для проверки vision-канала платформы. */
export const TEST_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

export class AiClientError extends Error {
  readonly status: number | null;

  constructor(message: string, status: number | null = null) {
    super(message);
    this.name = 'AiClientError';
    this.status = status;
  }
}

export type AiFetch = typeof fetch;

/**
 * Приводит адрес платформы к виду `https://host/v1`:
 * — нормализует слэши, понимает OpenRouter-суффикс `#/`;
 * — отрезает лишний `/chat/completions`;
 * — добавляет `/v1`, если пользователь его не указал.
 */
export function normalizeBaseUrl(raw: string): string {
  let url = (raw ?? '').trim();
  if (!url) throw new AiClientError('Адрес API пустой');
  if (url.endsWith('#/')) url = url.slice(0, -2);
  if (url.endsWith('/chat/completions')) {
    url = url.slice(0, -'/chat/completions'.length);
  }
  while (url.endsWith('/')) url = url.slice(0, -1);
  if (!/^https?:\/\//.test(url)) {
    throw new AiClientError('Адрес API должен начинаться с http:// или https://');
  }
  if (url.startsWith('http://')) {
    // http:// легален для локальных прокси и LAN-эндпоинтов, но API-ключ
    // уйдёт в открытом виде — предупреждаем (ревью-находка #13).
    console.warn(
      '[ai] baseUrl использует http://: API-ключ передаётся без шифрования. ' +
        'Используйте https:// вне локальной сети.'
    );
  }
  if (!url.endsWith('/v1')) url = url + '/v1';
  return url;
}

interface ApiContentPart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string };
}

export type ApiMessage =
  | { role: 'system'; content: string }
  | { role: 'user'; content: string | ApiContentPart[] }
  | { role: 'assistant'; content: string };

export interface ChatUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/** Собирает user-сообщение с фото в формат OpenAI vision (не больше MAX_VISION_IMAGES). */
export function visionUserContent(prompt: string, images: AiImageAttachment[]): ApiContentPart[] {
  const capped = images.slice(0, MAX_VISION_IMAGES);
  return [
    { type: 'text', text: prompt },
    ...capped.map((image) => ({
      type: 'image_url' as const,
      image_url: { url: `data:${image.mimeType};base64,${image.base64}` }
    }))
  ];
}

/**
 * Вызов /chat/completions любой OpenAI-совместимой платформы.
 * fetch инжектится для тестов; ошибки сети и статусы заворачиваются в AiClientError.
 */
export async function chatCompletion(
  config: AiProviderConfig,
  messages: ApiMessage[],
  fetchImpl: AiFetch = fetch,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<{ content: string; usage: ChatUsage }> {
  const url = `${normalizeBaseUrl(config.baseUrl)}/chat/completions`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({ model: config.model, messages }),
      signal: controller.signal
    });
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    throw new AiClientError(`Сеть недоступна: ${reason}`);
  } finally {
    clearTimeout(timer);
  }
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new AiClientError(`API ${response.status}: ${body.slice(0, 300)}`, response.status);
  }
  const data = (await response.json()) as {
    choices?: { message?: { content?: unknown } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  };
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || content.length === 0) {
    throw new AiClientError('Пустой ответ модели');
  }
  return {
    content,
    usage: {
      promptTokens: data.usage?.prompt_tokens ?? 0,
      completionTokens: data.usage?.completion_tokens ?? 0,
      totalTokens: data.usage?.total_tokens ?? 0
    }
  };
}

/** Проверяет подключение минимальным запросом; возвращает задержку в мс. */
export async function testConnection(config: AiProviderConfig, fetchImpl: AiFetch = fetch): Promise<number> {
  const startedAt = Date.now();
  await chatCompletion(config, [{ role: 'user', content: 'ping' }], fetchImpl, 30000);
  return Date.now() - startedAt;
}

/** Проверяет, что модель принимает изображения (vision). */
export async function testVision(config: AiProviderConfig, fetchImpl: AiFetch = fetch): Promise<boolean> {
  await chatCompletion(
    config,
    [
      {
        role: 'user',
        content: visionUserContent('Ответь одним словом: что на картинке?', [
          { base64: TEST_PNG_BASE64, mimeType: 'image/png' }
        ])
      }
    ],
    fetchImpl,
    45000
  );
  return true;
}
