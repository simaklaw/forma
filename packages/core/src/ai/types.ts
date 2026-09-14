/**
 * On-device / local coach port — platform adapters (llama.rn, WebLLM, etc.)
 * implement CoachProvider. Core never imports native modules.
 */

export type CoachTone = "caring" | "direct" | "neutral";

export interface CoachContext {
  name: string;
  /** Home-workout goals (web) or metabolic goals (mobile) as free string. */
  goalLabel: string;
  doneToday: boolean;
  restDay: boolean;
  streak: number;
  /** Optional: plateau / refeed flags from MetabolicEngine. */
  protocolActive?: boolean;
  plateauSuspected?: boolean;
  tone?: CoachTone;
}

export interface CoachMessage {
  text: string;
  source: "rules" | "llm";
}

export interface CoachProvider {
  readonly id: string;
  /** Whether the backend is loaded and ready. */
  isReady(): boolean;
  /** Generate a short coach line; must not throw — return fallback on failure. */
  generate(ctx: CoachContext): Promise<CoachMessage>;
}
