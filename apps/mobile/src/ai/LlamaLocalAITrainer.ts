import {
  RulesLocalAITrainer,
  buildTrainerSystemPrompt,
  type ILocalAITrainer,
  type UserContextSnapshot,
} from '@forma/core';

/**
 * Mobile Edge-AI adapter (report §4).
 * llama.rn + GGUF needs an Expo dev client. This class is the port:
 * keep ILocalAITrainer, swap implementation when native binary exists.
 */
export class LlamaLocalAITrainer implements ILocalAITrainer {
  private fallback = new RulesLocalAITrainer();
  private ready = false;

  async initialize(onProgress?: (ratio: number) => void): Promise<void> {
    await this.fallback.initialize(onProgress);
    onProgress?.(1);
  }

  async generateAdvice(context: UserContextSnapshot, userPrompt: string): Promise<string> {
    void buildTrainerSystemPrompt(context);
    return this.fallback.generateAdvice(context, userPrompt);
  }

  async streamAdvice(
    context: UserContextSnapshot,
    userPrompt: string,
    onToken: (token: string) => void
  ): Promise<void> {
    return this.fallback.streamAdvice(context, userPrompt, onToken);
  }

  isLlmReady(): boolean {
    return this.ready;
  }
}
