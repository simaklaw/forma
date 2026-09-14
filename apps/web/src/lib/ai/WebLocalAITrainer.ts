import {
  RulesLocalAITrainer,
  buildTrainerSystemPrompt,
  type ILocalAITrainer,
  type UserContextSnapshot,
} from "@forma/core";

/**
 * Web Edge-AI adapter (report §4).
 * Detects WebGPU. When `@mlc-ai/web-llm` is added, wire it in initialize()
 * and assign `this.llm`. Until then: RulesLocalAITrainer (offline, private).
 */
export class WebLocalAITrainer implements ILocalAITrainer {
  private fallback = new RulesLocalAITrainer();
  private llm: ILocalAITrainer | null = null;
  gpuAvailable = false;

  async initialize(onProgress?: (ratio: number) => void): Promise<void> {
    this.gpuAvailable =
      typeof navigator !== "undefined" &&
      "gpu" in navigator &&
      Boolean((navigator as Navigator & { gpu?: unknown }).gpu);
    await this.fallback.initialize(onProgress);
    onProgress?.(1);
  }

  async generateAdvice(context: UserContextSnapshot, userPrompt: string): Promise<string> {
    if (this.llm) return this.llm.generateAdvice(context, userPrompt);
    void buildTrainerSystemPrompt(context);
    return this.fallback.generateAdvice(context, userPrompt);
  }

  async streamAdvice(
    context: UserContextSnapshot,
    userPrompt: string,
    onToken: (token: string) => void,
  ): Promise<void> {
    if (this.llm) return this.llm.streamAdvice(context, userPrompt, onToken);
    return this.fallback.streamAdvice(context, userPrompt, onToken);
  }
}
