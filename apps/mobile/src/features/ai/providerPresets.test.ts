import { AI_PROVIDER_PRESETS, providerPresetById } from './providerPresets';
import { normalizeBaseUrl } from './openAiClient';

describe('providerPresets (MD3 фаза 4.1: сид-пресеты провайдеров ИИ)', () => {
  it('каждый пресет: валидный https-адрес, оканчивающийся на /v1', () => {
    expect(AI_PROVIDER_PRESETS.length).toBeGreaterThanOrEqual(5);
    for (const preset of AI_PROVIDER_PRESETS) {
      expect(preset.baseUrl.startsWith('https://')).toBe(true);
      expect(normalizeBaseUrl(preset.baseUrl)).toBe(preset.baseUrl);
    }
  });

  it('id и label уникальны; модели без пустых строк и дублей', () => {
    const ids = new Set<string>();
    const labels = new Set<string>();
    for (const preset of AI_PROVIDER_PRESETS) {
      expect(ids.has(preset.id)).toBe(false);
      expect(labels.has(preset.label)).toBe(false);
      ids.add(preset.id);
      labels.add(preset.label);
      expect(preset.models.length).toBeGreaterThan(0);
      expect(new Set(preset.models).size).toBe(preset.models.length);
      for (const model of preset.models) {
        expect(model.trim()).toBe(model);
        expect(model.length).toBeGreaterThan(0);
      }
    }
  });

  it('providerPresetById: известный id — пресет, мусор — null', () => {
    expect(providerPresetById('openai')?.baseUrl).toBe('https://api.openai.com/v1');
    expect(providerPresetById('groq')?.models[0]).toBe('llama-3.3-70b-versatile');
    expect(providerPresetById('unknown')).toBeNull();
    expect(providerPresetById('')).toBeNull();
  });

  it('первая модель пресета непустая — подставляется в форму', () => {
    for (const preset of AI_PROVIDER_PRESETS) {
      expect(typeof preset.models[0]).toBe('string');
      expect(preset.models[0].length).toBeGreaterThan(0);
    }
  });
});
