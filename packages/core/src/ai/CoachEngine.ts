import { RulesCoach, coachLine } from "./RulesCoach";
import { RulesLocalAITrainer } from "./RulesLocalAITrainer";
import type { ILocalAITrainer } from "./ILocalAITrainer";
import type { CoachContext, CoachMessage, CoachProvider } from "./types";

/**
 * Facade for coach copy + local-AI trainer.
 * Default: RulesCoach / RulesLocalAITrainer.
 * Apps register llama.rn or WebLLM without changing UI call sites.
 */
export class CoachEngine {
  private static provider: CoachProvider = new RulesCoach();
  private static readonly fallback = new RulesCoach();
  private static trainer: ILocalAITrainer = new RulesLocalAITrainer();

  static setProvider(provider: CoachProvider): void {
    this.provider = provider;
  }

  static setTrainer(trainer: ILocalAITrainer): void {
    this.trainer = trainer;
  }

  static getTrainer(): ILocalAITrainer {
    return this.trainer;
  }

  /** True when the active adapter reports a loaded on-device model. */
  static isLlmReady(): boolean {
    return typeof this.trainer.isLlmReady === "function" ? Boolean(this.trainer.isLlmReady()) : false;
  }

  static resetProvider(): void {
    this.provider = this.fallback;
    this.trainer = new RulesLocalAITrainer();
  }

  static getProviderId(): string {
    return this.provider.id;
  }

  /** Sync path for screens that cannot await (e.g. first paint). */
  static lineSync(ctx: CoachContext): string {
    return coachLine(ctx);
  }

  static async line(ctx: CoachContext): Promise<CoachMessage> {
    try {
      if (!this.provider.isReady()) {
        return this.fallback.generate(ctx);
      }
      return await this.provider.generate(ctx);
    } catch {
      return this.fallback.generate(ctx);
    }
  }
}

export type { CoachContext, CoachMessage, CoachProvider, CoachTone } from "./types";
export { RulesCoach, coachLine } from "./RulesCoach";
export { RulesLocalAITrainer } from "./RulesLocalAITrainer";
export {
  type ILocalAITrainer,
  type UserContextSnapshot,
  buildTrainerSystemPrompt,
  calorieDelta,
} from "./ILocalAITrainer";
