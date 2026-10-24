/**
 * SwapGraph — curated easier/harder exercise alternatives.
 *
 * Concept (swaps / easier / harder progressions) borrowed clean-room from the
 * GymBells review; taxonomy and code are original. Raw declarations may be
 * one-directional: buildSwapGraph mirrors every edge, drops self-references,
 * duplicates and invalid ids, so lookups are symmetric.
 */

export interface SwapEdge {
  /** Ids of variants that are easier than this exercise. */
  easier?: readonly number[];
  /** Ids of variants that are harder than this exercise. */
  harder?: readonly number[];
}

/** Raw swap declarations: exercise id → edge (either direction). */
export type SwapGraphInput = Record<number, SwapEdge>;

export interface SwapOptions {
  /** Ids of easier variants, in declaration order. */
  easier: number[];
  /** Ids of harder variants, in declaration order. */
  harder: number[];
}

/** Normalized swap graph: symmetric, deduped, self-reference free. */
export type SwapGraph = Record<number, SwapOptions>;

function emptyOptions(): SwapOptions {
  return { easier: [], harder: [] };
}

function pushUnique(ids: number[], id: number): void {
  if (!ids.includes(id)) {
    ids.push(id);
  }
}

function isExerciseId(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

/**
 * Normalizes raw swap declarations into a symmetric graph:
 * - if A lists B as harder, B gets A as easier (and vice versa);
 * - self-references and duplicates are dropped;
 * - non-integer or non-positive ids are skipped.
 */
export function buildSwapGraph(input: SwapGraphInput): SwapGraph {
  const graph: SwapGraph = {};
  const ensure = (id: number): SwapOptions => {
    const existing = graph[id];
    if (existing) {
      return existing;
    }
    const created = emptyOptions();
    graph[id] = created;
    return created;
  };
  for (const [key, edge] of Object.entries(input)) {
    const id = Number(key);
    if (!isExerciseId(id)) {
      continue;
    }
    const self = ensure(id);
    for (const target of edge?.harder ?? []) {
      if (!isExerciseId(target) || target === id) {
        continue;
      }
      pushUnique(self.harder, target);
      pushUnique(ensure(target).easier, id);
    }
    for (const target of edge?.easier ?? []) {
      if (!isExerciseId(target) || target === id) {
        continue;
      }
      pushUnique(self.easier, target);
      pushUnique(ensure(target).harder, id);
    }
  }
  return graph;
}

/** Easier/harder alternatives of an exercise; empty lists when unknown. */
export function swapOptions(graph: SwapGraph, exerciseId: number): SwapOptions {
  return graph[exerciseId] ?? emptyOptions();
}
