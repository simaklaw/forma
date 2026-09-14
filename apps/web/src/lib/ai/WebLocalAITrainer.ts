import {
  RulesLocalAITrainer,
  buildTrainerSystemPrompt,
  type ILocalAITrainer,
  type UserContextSnapshot,
} from "@forma/core";

/**
 * Web Edge-AI adapter (report §4).
 * Uses WebGPU when present. WebLLM (`@mlc-ai/web-llm`) is optional —
 * if the package is not installed, falls back to RulesLocalAITrainer.
 * Heavy inference belongs in a Worker; the fallback is sync and cheap.
 */
export class WebLocalAITrainer implements ILocalAITrainer {
  private fallback = new RulesLocalAITrainer();
  private llm: ILocalAITrainer | null = null;
  gpuAvailable = false;

  async initialize(onProgress?: (ratio: number) => void): Promise<void> {
    this.gpuAvailable =
      typeof navigator !== "undefined" && "gpu" in navigator && Boolean((navigator as Navigator & { gpu?: unknown }).gpu);
    try {
      const mod = await import(/* @vite-ignore */ "@mlc-ai/web-llm");
      if (mod && this.gpuAvailable) {
        // Hook point: create MLC engine here when the dep is added to package.json.
        void mod;
      }
    } catch {
      /* optional dependency */
    }
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
