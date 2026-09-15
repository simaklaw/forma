import assert from "node:assert/strict";
import { test } from "node:test";
import { createFormaSlice, type UnifiedFormaState } from "./useFormaStore.ts";

function createTestStore() {
  let state!: UnifiedFormaState;
  const set = (fn: (current: UnifiedFormaState) => Partial<UnifiedFormaState> | UnifiedFormaState) => {
    state = { ...state, ...fn(state) };
  };
  state = createFormaSlice(set, () => state);
  return state;
}

test("today burned calories uses the same local-day boundary as food logs", () => {
  const store = createTestStore();
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  store.workoutLogs.push(
    {
      id: "today",
      exerciseId: "squat",
      durationMinutes: 60,
      caloriesBurned: 500,
      completedAt: today.toISOString(),
    },
    {
      id: "yesterday",
      exerciseId: "walk",
      durationMinutes: 30,
      caloriesBurned: 200,
      completedAt: yesterday.toISOString(),
    },
  );

  assert.equal(store.getTodayBurnedCalories(), 500);
});

test("store rejects invalid food and biometric values", () => {
  const store = createTestStore();
  assert.throws(
    () => store.addFoodLog({ name: "", calories: 100, protein: 10, carbs: 10, fat: 5 }),
    RangeError,
  );
  assert.throws(
    () => store.addFoodLog({ name: "Food", calories: -1, protein: 10, carbs: 10, fat: 5 }),
    RangeError,
  );
  assert.throws(() => store.updateBiometrics({ weightKg: 0 }), RangeError);
});

test("store accepts zero-duration workouts and validates RPE", () => {
  const store = createTestStore();
  store.addWorkoutLog({ exerciseId: "stretch", durationMinutes: 0, caloriesBurned: 0 });
  assert.equal(store.workoutLogs.length, 1);
  assert.throws(
    () => store.addWorkoutLog({ exerciseId: "bench", durationMinutes: 10, caloriesBurned: 50, rpeScore: 11 }),
    RangeError,
  );
});
