import { getConfiguredLlamaModelUrl, LLAMA_MODEL_FILENAME } from './LlamaModelService';

describe('LlamaModelService', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
  });

  it('exposes a stable GGUF filename', () => {
    expect(LLAMA_MODEL_FILENAME).toMatch(/\.gguf$/i);
  });

  it('returns null when EXPO_PUBLIC_LLAMA_MODEL_URL is empty', () => {
    process.env = { ...originalEnv, EXPO_PUBLIC_LLAMA_MODEL_URL: '' };
    expect(getConfiguredLlamaModelUrl()).toBeNull();
  });

  it('trims a configured model URL', () => {
    process.env = {
      ...originalEnv,
      EXPO_PUBLIC_LLAMA_MODEL_URL: '  https://example.com/model.gguf  '
    };
    expect(getConfiguredLlamaModelUrl()).toBe('https://example.com/model.gguf');
  });
});
