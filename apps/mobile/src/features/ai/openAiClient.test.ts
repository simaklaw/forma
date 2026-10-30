import {
  AiClientError,
  chatCompletion,
  normalizeBaseUrl,
  testConnection,
  visionUserContent,
  MAX_VISION_IMAGES
} from './openAiClient';
import type { AiProviderConfig } from './types';

const config: AiProviderConfig = {
  id: 'p1',
  label: 'Test',
  baseUrl: 'https://api.example.com',
  apiKey: 'sk-test',
  model: 'gpt-test',
  supportsVision: true
};

function okResponse(body: unknown) {
  return {
    ok: true,
    status: 200,
    json: async () => body,
    text: async () => JSON.stringify(body)
  };
}

describe('normalizeBaseUrl', () => {
  it('appends /v1 when missing', () => {
    expect(normalizeBaseUrl('https://api.example.com')).toBe('https://api.example.com/v1');
  });

  it('trims trailing slashes and keeps /v1', () => {
    expect(normalizeBaseUrl('https://api.example.com/v1/')).toBe('https://api.example.com/v1');
    expect(normalizeBaseUrl(' https://api.example.com/v1 ')).toBe('https://api.example.com/v1');
  });

  it('strips a redundant /chat/completions suffix', () => {
    expect(normalizeBaseUrl('https://api.example.com/v1/chat/completions')).toBe(
      'https://api.example.com/v1'
    );
  });

  it('understands the OpenRouter #/ suffix', () => {
    expect(normalizeBaseUrl('https://openrouter.ai/api/v1#/')).toBe('https://openrouter.ai/api/v1');
  });

  it('warns when the base URL is insecure http and stays silent for https', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      expect(normalizeBaseUrl('http://192.168.0.2:8000')).toBe('http://192.168.0.2:8000/v1');
      expect(warn).toHaveBeenCalledTimes(1);
      expect(String(warn.mock.calls[0][0])).toContain('без шифрования');
      expect(normalizeBaseUrl('https://api.example.com')).toBe('https://api.example.com/v1');
      expect(warn).toHaveBeenCalledTimes(1);
    } finally {
      warn.mockRestore();
    }
  });

  it('rejects empty and non-http values', () => {
    expect(() => normalizeBaseUrl('')).toThrow(AiClientError);
    expect(() => normalizeBaseUrl('api.example.com')).toThrow(AiClientError);
  });
});

describe('chatCompletion', () => {
  it('posts to /v1/chat/completions with auth header and parses content', async () => {
    const fetchImpl = jest.fn(async () =>
      okResponse({
        choices: [{ message: { content: 'Привет!' } }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
      })
    );
    const result = await chatCompletion(config, [{ role: 'user', content: 'hi' }], fetchImpl as never);
    const [url, init] = (fetchImpl as jest.Mock).mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.example.com/v1/chat/completions');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer sk-test');
    expect(JSON.parse(String(init.body)).model).toBe('gpt-test');
    expect(result.content).toBe('Привет!');
    expect(result.usage).toEqual({ promptTokens: 10, completionTokens: 5, totalTokens: 15 });
  });

  it('wraps HTTP errors with status and body snippet', async () => {
    const fetchImpl = jest.fn(async () => ({
      ok: false,
      status: 401,
      json: async () => ({}),
      text: async () => '{"error":"bad key"}'
    }));
    await expect(chatCompletion(config, [], fetchImpl as never)).rejects.toThrow(
      'API 401: {"error":"bad key"}'
    );
  });

  it('rejects empty model replies', async () => {
    const fetchImpl = jest.fn(async () => okResponse({ choices: [] }));
    await expect(chatCompletion(config, [], fetchImpl as never)).rejects.toThrow('Пустой ответ модели');
  });
});

describe('visionUserContent', () => {
  it('builds data URLs and caps attachments at the limit', () => {
    const images = Array.from({ length: MAX_VISION_IMAGES + 3 }, (_, i) => ({
      base64: String(i),
      mimeType: 'image/jpeg'
    }));
    const parts = visionUserContent('Что на фото?', images);
    expect(parts[0]).toEqual({ type: 'text', text: 'Что на фото?' });
    expect(parts).toHaveLength(1 + MAX_VISION_IMAGES);
    expect(parts[1].image_url?.url).toBe('data:image/jpeg;base64,0');
  });
});

describe('testConnection', () => {
  it('returns latency on success', async () => {
    const fetchImpl = jest.fn(async () => okResponse({ choices: [{ message: { content: 'pong' } }] }));
    const latency = await testConnection(config, fetchImpl as never);
    expect(latency).toBeGreaterThanOrEqual(0);
  });
});
