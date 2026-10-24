import { GYM_PLAN } from './gymPlan';
import { WORKOUT_PLAN } from './bodyweightPlan';
import {
  PLAN_EXERCISES,
  SWAP_EDGES,
  SWAP_GRAPH,
  swapsForPlanExercise
} from './exerciseSwaps';

const planIds = (): number[] => [
  ...GYM_PLAN.flatMap((day) => day.exercises.map((ex) => ex.id)),
  ...WORKOUT_PLAN.flatMap((day) => day.exercises.map((ex) => ex.id))
];

describe('SWAP_EDGES', () => {
  it('only references plan exercise ids', () => {
    const ids = new Set(planIds());
    for (const [key, edge] of Object.entries(SWAP_EDGES)) {
      expect(ids.has(Number(key))).toBe(true);
      for (const target of edge.harder) {
        expect(ids.has(target)).toBe(true);
      }
    }
  });
});

describe('SWAP_GRAPH', () => {
  it('is symmetric and free of self-references', () => {
    for (const [key, options] of Object.entries(SWAP_GRAPH)) {
      const id = Number(key);
      expect(options.easier).not.toContain(id);
      expect(options.harder).not.toContain(id);
      for (const target of options.harder) {
        expect(SWAP_GRAPH[target]?.easier).toContain(id);
      }
      for (const target of options.easier) {
        expect(SWAP_GRAPH[target]?.harder).toContain(id);
      }
    }
  });
});

describe('swapsForPlanExercise', () => {
  it('returns names for curated progressions', () => {
    const pushup = swapsForPlanExercise(10);
    expect(pushup.harder.map((s) => s.name)).toContain('Отжимания с возвышения ног');
    const pullup = swapsForPlanExercise(11);
    expect(pullup.easier.map((s) => s.name)).toContain('Австралийские подтягивания');
    const squat = swapsForPlanExercise(1);
    expect(squat.easier.map((s) => s.name)).toContain('Жим ногами');
  });

  it('is empty for exercises without curated swaps and for unknown ids', () => {
    expect(swapsForPlanExercise(36)).toEqual({ easier: [], harder: [] });
    expect(swapsForPlanExercise(999999)).toEqual({ easier: [], harder: [] });
  });

  it('every swap resolves to a plan exercise name', () => {
    for (const id of planIds()) {
      const swaps = swapsForPlanExercise(id);
      for (const swap of [...swaps.easier, ...swaps.harder]) {
        expect(PLAN_EXERCISES[swap.id]).toBeDefined();
        expect(swap.name.length).toBeGreaterThan(0);
      }
    }
  });
});
