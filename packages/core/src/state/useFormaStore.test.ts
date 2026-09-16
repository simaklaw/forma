import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createFormaSlice,
  migrateFormaState,
  FORMA_PERSIST_VERSION,
  type UnifiedFormaState,
} from "./useFormaStore.ts";

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

test("AI context uses TDEE by default and accepts an explicit product target", () => {
  const store = createTestStore();
  const tdee = store.getTDEE();
  assert.equal(store.getUserContextSnapshot().dailyMetrics.targetCalories, tdee);
  assert.equal(store.getUserContextSnapshot(2370).dailyMetrics.targetCalories, 2370);
  assert.throws(() => store.getUserContextSnapshot(-1), RangeError);
  assert.throws(() => store.getUserContextSnapshot(Number.NaN), RangeError);
});

test("persisted state migration upgrades the unversioned format", () => {
  const migrated = migrateFormaState(
    {
      biometrics: { weightKg: 80, heightCm: 180, age: 30, gender: "male", activityFactor: 1.55 },
      foodLogs: [{ id: "food-1", name: "Oats", calories: 300, protein: 10, carbs: 50, fat: 7, loggedAt: 123 }],
      workoutLogs: [],
    },
    0,
  );

  assert.equal(FORMA_PERSIST_VERSION, 1);
  assert.equal(migrated.biometrics.weightKg, 80);
  assert.equal(migrated.foodLogs.length, 1);
});

test("persisted state migration drops malformed records and invalid biometrics", () => {
  const migrated = migrateFormaState(
    {
      biometrics: { weightKg: -5, heightCm: 180, age: 30, gender: "male", activityFactor: 1.55 },
      foodLogs: [
        { id: "valid", name: "Rice", calories: 200, protein: 4, carbs: 45, fat: 1, loggedAt: 123 },
        { id: "invalid", name: "", calories: -1, protein: 0, carbs: 0, fat: 0, loggedAt: 123 },
      ],
      workoutLogs: [
        { id: "valid", exerciseId: "squat", durationMinutes: 30, caloriesBurned: 250, completedAt: new Date().toISOString() },
        { id: "invalid", exerciseId: "", durationMinutes: 30, caloriesBurned: 250, completedAt: "not-a-date" },
      ],
    },
    0,
  );

  assert.equal(migrated.biometrics.weightKg, 70);
  assert.equal(migrated.foodLogs.length, 1);
  assert.equal(migrated.workoutLogs.length, 1);
});

test("persisted state migration rejects versions newer than the app schema", () => {
  assert.throws(
    () => migrateFormaState({}, FORMA_PERSIST_VERSION + 1),
    /Unsupported Forma persistence version/,
  );
});
