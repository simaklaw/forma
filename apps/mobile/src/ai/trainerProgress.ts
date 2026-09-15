/** Shared load ratio for llama.rn / GGUF (0–1). UI polls this module. */
let progress = 0;

export function setMobileTrainerProgress(ratio: number): void {
  progress = Math.max(0, Math.min(1, ratio));
}

export function getMobileTrainerProgress(): number {
  return progress;
}
