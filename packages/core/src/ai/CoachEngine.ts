import { RulesCoach, coachLine } from "./RulesCoach";
import type { CoachContext, CoachMessage, CoachProvider } from "./types";

/**
 * Facade for coach copy. Default provider is RulesCoach.
 * Apps can register an LLM provider later (llama.rn / WebLLM) without
 * changing UI call sites.
 */
export class CoachEngine {
  private static provider: CoachProvider = new RulesCoach();
  private static readonly fallback = new RulesCoach();

  static setProvider(provider: CoachProvider): void {
    this.provider = provider;
  }

  static resetProvider(): void {
    this.provider = this.fallback;
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
