import manifest from "@/lib/exercise-dataset-manifest.json";
import type { ExerciseReferenceMeta } from "@/components/ExerciseReferencePanel";

type Entry = (typeof manifest)[number];

function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function score(a: string, b: string): number {
  const ta = new Set(tokens(a));
  const tb = new Set(tokens(b));
  if (!ta.size || !tb.size) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter += 1;
  return inter / Math.max(ta.size, tb.size);
}

export function datasetMetaForName(name: string): ExerciseReferenceMeta | null {
  let best: Entry | null = null;
  let bestScore = 0;
  for (const e of manifest) {
    const s = Math.max(score(name, e.name), score(name, e.id.replace(/^lib-/, "").replace(/-/g, " ")));
    if (s > bestScore) {
      bestScore = s;
      best = e;
    }
  }
  if (!best || bestScore < 0.45) return null;
  return {
    name: best.name,
    gifUrl: best.gifUrl,
    thumbUrl: best.thumbUrl,
    instructionsEn: best.instructionsEn,
    secondaryMuscles: best.secondaryMuscles,
    target: best.target,
    bodyPart: best.bodyPart,
    attribution: best.attribution,
  };
}
