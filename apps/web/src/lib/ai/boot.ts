import { CoachEngine } from "@forma/core";
import { WebLocalAITrainer } from "./WebLocalAITrainer";

let booted = false;
let loadProgress = 0;

export function getWebTrainerProgress(): number {
  return loadProgress;
}

/** Register WebLLM adapter immediately; initialize model in the background. */
export function bootWebTrainer(onProgress?: (ratio: number) => void) {
  if (booted) return;
  booted = true;
  const trainer = new WebLocalAITrainer();
  CoachEngine.setTrainer(trainer);
  void trainer.initialize((ratio) => {
    loadProgress = ratio;
    onProgress?.(ratio);
  });
}
