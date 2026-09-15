import {
  RulesLocalAITrainer,
  buildTrainerSystemPrompt,
  type ILocalAITrainer,
  type UserContextSnapshot,
} from "@forma/core";
import type { MLCEngineInterface } from "@mlc-ai/web-llm";

/** Smallest Llama 3.2 model available in WebLLM's prebuilt model registry. */
export const WEB_MODEL_ID = "Llama-3.2-1B-Instruct-q4f16_1-MLC";

type ProgressCallback = (ratio: number) => void;

/**
 * Browser Edge-AI adapter.
 *
 * WebLLM is imported only after a browser with WebGPU has been detected, so
 * SSR, tests, and browsers without WebGPU keep the private rules fallback and
 * do not download model/runtime assets. The model is cached by WebLLM/OPFS
 * after its first load.
 */
export class WebLocalAITrainer implements ILocalAITrainer {
  private readonly fallback = new RulesLocalAITrainer();
  private engine: MLCEngineInterface | null = null;
  private initialization: Promise<void> | null = null;
  gpuAvailable = false;

  async initialize(onProgress?: ProgressCallback): Promise<void> {
    if (this.initialization) return this.initialization;

    this.initialization = this.load(onProgress).catch(() => {
      // RulesLocalAITrainer remains available when WebGPU, model assets, or
      // browser storage are unavailable. Local AI must never block the coach.
      this.engine = null;
      onProgress?.(1);
    });
    return this.initialization;
  }

  private async load(onProgress?: ProgressCallback): Promise<void> {
    this.gpuAvailable =
      typeof navigator !== "undefined" &&
      "gpu" in navigator &&
      Boolean((navigator as Navigator & { gpu?: unknown }).gpu);

    if (!this.gpuAvailable) {
      await this.fallback.initialize(onProgress);
      return;
    }

    const { CreateWebWorkerMLCEngine } = await import("@mlc-ai/web-llm");
    const worker = new Worker(new URL("./webllm.worker.ts", import.meta.url), {
      type: "module",
    });
    this.engine = await CreateWebWorkerMLCEngine(worker, WEB_MODEL_ID, {
      initProgressCallback: (report) => onProgress?.(report.progress),
    });
    onProgress?.(1);
  }

  isLlmReady(): boolean {
    return this.engine !== null;
  }

  async generateAdvice(context: UserContextSnapshot, userPrompt: string): Promise<string> {
    if (!this.engine) return this.fallback.generateAdvice(context, userPrompt);

    try {
      const response = await this.engine.chat.completions.create({
        messages: [
          { role: "system", content: buildTrainerSystemPrompt(context) },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 160,
      });
      return response.choices[0]?.message.content?.trim() || this.fallback.generateAdvice(context, userPrompt);
    } catch {
      return this.fallback.generateAdvice(context, userPrompt);
    }
  }

  async streamAdvice(
    context: UserContextSnapshot,
    userPrompt: string,
    onToken: (token: string) => void,
  ): Promise<void> {
    if (!this.engine) return this.fallback.streamAdvice(context, userPrompt, onToken);

    let emitted = false;
    try {
      const stream = await this.engine.chat.completions.create({
        messages: [
          { role: "system", content: buildTrainerSystemPrompt(context) },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 160,
        stream: true,
      });
      for await (const chunk of stream) {
        const token = chunk.choices[0]?.delta.content;
        if (token) {
          emitted = true;
          onToken(token);
        }
      }
    } catch {
      // If the stream already emitted tokens, replaying the whole rules answer
      // would duplicate content in the UI. Fall back only before first output.
      if (!emitted) await this.fallback.streamAdvice(context, userPrompt, onToken);
    }
  }
}
