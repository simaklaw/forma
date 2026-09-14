import assert from "node:assert/strict";
import { test } from "node:test";
import {
  bmrMifflin,
  calorieGoalFromProfile,
  coachLine,
  isRestDay,
  macroGoals,
  mealMacros,
  streakCount,
  todayKey,
} from "./forma.ts";
import type { Food, MealItem, Profile } from "./types.ts";

test("todayKey format", () => {
  assert.match(todayKey(new Date("2026-03-15T10:00:00")), /^\d{4}-\d{2}-\d{2}$/);
});

test("bmr Mifflin man vs woman", () => {
  const man = bmrMifflin({ sex: "man", weightKg: 80, heightCm: 180, age: 30 });
  const woman = bmrMifflin({ sex: "woman", weightKg: 80, heightCm: 180, age: 30 });
  assert.ok(man > woman);
  assert.ok(man > 1600 && man < 2000);
});

test("calorieGoalFromProfile responds to goal", () => {
  const base: Pick<Profile, "presentation" | "weightKg" | "heightCm" | "age" | "goal"> = {
    presentation: "man",
    weightKg: 80,
    heightCm: 180,
    age: 30,
    goal: "energy",
  };
  const energy = calorieGoalFromProfile(base);
  const strength = calorieGoalFromProfile({ ...base, goal: "strength" });
  const tone = calorieGoalFromProfile({ ...base, goal: "tone" });
  assert.ok(strength > energy);
  assert.ok(tone < energy);
});

test("macroGoals sum roughly to kcal", () => {
  const m = macroGoals(2000, "tone");
  const recon = m.protein * 4 + m.fat * 9 + m.carbs * 4;
  assert.ok(Math.abs(recon - 2000) < 40);
});

test("coachLine rest and done", () => {
  assert.match(coachLine({ name: "Аня", goal: "tone", doneToday: true, restDay: false, streak: 1 }), /готово|достаточно/i);
  assert.match(coachLine({ name: "Аня", goal: "tone", doneToday: false, restDay: true, streak: 0 }), /отдых/i);
});

test("isRestDay", () => {
  // Monday = 1
  const mon = new Date("2026-03-16T12:00:00"); // Monday
  assert.equal(isRestDay([1, 3, 5], mon), false);
  assert.equal(isRestDay([2, 4], mon), true);
});

test("streakCount consecutive", () => {
  const today = todayKey();
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const yest = todayKey(d);
  d.setDate(d.getDate() - 1);
  const two = todayKey(d);
  assert.equal(
    streakCount([
      { date: today, completed: true },
      { date: yest, completed: true },
      { date: two, completed: true },
    ]),
    3,
  );
  assert.equal(
    streakCount([
      { date: today, completed: true },
      { date: yest, completed: false },
    ]),
    1,
  );
});

test("mealMacros scales by grams", () => {
  const foods: Food[] = [{ id: "f1", name: "Творог", kcal: 100, protein: 16, fat: 2, carbs: 3 }];
  const items: MealItem[] = [{ id: "1", date: todayKey(), meal: "breakfast", foodId: "f1", grams: 200 }];
  const m = mealMacros(items, foods);
  assert.equal(m.kcal, 200);
  assert.equal(m.protein, 32);
});
