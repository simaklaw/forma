/**
 * Curated-замены упражнений (проще / сложнее) — clean-room концепция
 * swaps/easier/harder из обзора GymBells. Только идея; пары и код
 * собственные. Декларируется только направление «сложнее» — симметрию
 * (кто кому «проще») достраивает buildSwapGraph из @forma/core.
 */
import { buildSwapGraph, swapOptions, type SwapGraph } from '@forma/core';
import { GYM_PLAN } from './gymPlan';
import { WORKOUT_PLAN } from './bodyweightPlan';
import type { ExerciseDef } from './ExerciseSheet';

/** Однонаправленные рёбра прогрессии: id упражнения → более сложные варианты. */
export const SWAP_EDGES: Record<number, { harder: number[] }> = {
  5: { harder: [40] },
  6: { harder: [46] },
  10: { harder: [49] },
  12: { harder: [50] },
  14: { harder: [51] },
  15: { harder: [54, 17] },
  18: { harder: [55] },
  20: { harder: [21] },
  23: { harder: [4] },
  33: { harder: [7] },
  35: { harder: [1] },
  37: { harder: [2] },
  47: { harder: [46] },
  50: { harder: [11] },
  52: { harder: [14] },
  58: { harder: [51] },
  59: { harder: [49] },
  60: { harder: [21] },
  61: { harder: [54, 17] },
  62: { harder: [51] },
};

/** Все упражнения планов по числовому id (зал + дом). */
export const PLAN_EXERCISES: Record<number, ExerciseDef> = (() => {
  const byId: Record<number, ExerciseDef> = {};
  for (const day of [...GYM_PLAN, ...WORKOUT_PLAN]) {
    for (const ex of day.exercises) {
      byId[ex.id] = ex;
    }
  }
  return byId;
})();

/** Нормализованный граф замен: симметричный, без дублей и самоссылок. */
export const SWAP_GRAPH: SwapGraph = buildSwapGraph(SWAP_EDGES);

export interface ExerciseSwap {
  id: number;
  name: string;
}

/** Варианты «проще / сложнее» для упражнения плана; для прочих id — пусто. */
export function swapsForPlanExercise(
  exerciseId: number
): { easier: ExerciseSwap[]; harder: ExerciseSwap[] } {
  const options = swapOptions(SWAP_GRAPH, exerciseId);
  const toSwap = (id: number): ExerciseSwap | null => {
    const def = PLAN_EXERCISES[id];
    return def ? { id, name: def.name } : null;
  };
  return {
    easier: options.easier.map(toSwap).filter((s): s is ExerciseSwap => s !== null),
    harder: options.harder.map(toSwap).filter((s): s is ExerciseSwap => s !== null)
  };
}
