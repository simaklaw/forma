import {
  RulesLocalAITrainer,
  buildTrainerSystemPrompt,
  type ILocalAITrainer,
  type UserContextSnapshot,
} from '@forma/core';
import type { LlamaContext } from 'llama.rn';
import { ensureLlamaModel } from '@/services/LlamaModelService';

const STOP_WORDS = ['</s>', '<|end|>', '<|eot_id|>', '<|end_of_text|>', '<|im_end|>'];

/**
 * Mobile Edge-AI adapter for Expo dev/EAS clients with llama.rn 0.9.x.
 * The native module and GGUF are optional at runtime; standard Expo/Jest
 * environments keep using the private rules fallback.
 */
export class LlamaLocalAITrainer implements ILocalAITrainer {
  private readonly fallback = new RulesLocalAITrainer();
  private context: LlamaContext | null = null;
  private initialization: Promise<void> | null = null;

  async initialize(onProgress?: (ratio: number) => void): Promise<void> {
    if (this.initialization) return this.initialization;

    this.initialization = this.load(onProgress).catch(() => {
      this.context = null;
      onProgress?.(1);
    });
    return this.initialization;
  }

  private async load(onProgress?: (ratio: number) => void): Promise<void> {
    const modelPath = await ensureLlamaModel((ratio) => onProgress?.(ratio * 0.7));
    if (!modelPath) {
      await this.fallback.initialize(onProgress);
      return;
    }

    // Expo's legacy TS module target reports TS1323 although Metro supports
    // this lazy native import at runtime.
    // @ts-expect-error -- dynamic import is intentionally resolved by Metro.
    const { initLlama } = await import('llama.rn');
    this.context = await initLlama(
      {
        model: modelPath,
        use_mlock: true,
        n_ctx: 2048,
        n_gpu_layers: 99,
      },
      (ratio) => onProgress?.(0.7 + ratio * 0.3),
    );
    onProgress?.(1);
  }

  async generateAdvice(context: UserContextSnapshot, userPrompt: string): Promise<string> {
    if (!this.context) return this.fallback.generateAdvice(context, userPrompt);

    try {
      const result = await this.context.completion({
        messages: [
          { role: 'system', content: buildTrainerSystemPrompt(context) },
          { role: 'user', content: userPrompt },
        ],
        n_predict: 160,
        temperature: 0.3,
        stop: STOP_WORDS,
      });
      return result.text.trim() || this.fallback.generateAdvice(context, userPrompt);
    } catch {
      return this.fallback.generateAdvice(context, userPrompt);
    }
  }

  async streamAdvice(
    context: UserContextSnapshot,
    userPrompt: string,
    onToken: (token: string) => void,
  ): Promise<void> {
    if (!this.context) return this.fallback.streamAdvice(context, userPrompt, onToken);

    let emitted = false;
    try {
      await this.context.completion(
        {
          messages: [
            { role: 'system', content: buildTrainerSystemPrompt(context) },
            { role: 'user', content: userPrompt },
          ],
          n_predict: 160,
          temperature: 0.3,
          stop: STOP_WORDS,
        },
        (data) => {
          if (data.token) emitted = true;
          onToken(data.token);
        },
      );
    } catch {
      // Replaying the full rules response after partial LLM output would
      // duplicate text in the UI. Fall back only before first output.
      if (!emitted) await this.fallback.streamAdvice(context, userPrompt, onToken);
    }
  }

  isLlmReady(): boolean {
    return this.context !== null;
  }
}
