import { CoachEngine } from "@forma/core";
import { WebLocalAITrainer } from "./WebLocalAITrainer";

let booted = false;

export function bootWebTrainer() {
  if (booted) return;
  booted = true;
  const trainer = new WebLocalAITrainer();
  void trainer.initialize().then(() => CoachEngine.setTrainer(trainer));
}
