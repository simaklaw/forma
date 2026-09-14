import assert from "node:assert/strict";
import { test } from "node:test";
import {
  calcGoals,
  coachLine,
  dayMacros,
  todayKey,
} from "./forma.ts";
import type { Food, MealItem } from "./types.ts";

test("todayKey format", () => {
  assert.match(todayKey(new Date("2026-03-15T10:00:00")), /^\d{4}-\d{2}-\d{2}$/);
});

test("calcGoals strength > tone calories", () => {
  const base = {
    presentation: "man" as const,
    weightKg: 80,
    heightCm: 180,
    age: 30,
  };
  const energy = calcGoals({ ...base, goal: "energy" });
  const strength = calcGoals({ ...base, goal: "strength" });
  const tone = calcGoals({ ...base, goal: "tone" });
  assert.ok(strength.kcal > energy.kcal);
  assert.ok(tone.kcal < energy.kcal);
});

test("coachLine rest and done", () => {
  assert.match(
    coachLine({ name: "Аня", goal: "tone", doneToday: true, restDay: false, streak: 1 }),
    /готово|достаточно/i,
  );
  assert.match(
    coachLine({ name: "Аня", goal: "tone", doneToday: false, restDay: true, streak: 0 }),
    /отдых/i,
  );
});

test("dayMacros scales by grams", () => {
  const foods: Food[] = [{ id: "f1", name: "Творог", kcal: 100, protein: 16, fat: 2, carbs: 3 }];
  const items: MealItem[] = [
    { id: "1", date: todayKey(), meal: "breakfast", foodId: "f1", grams: 200 },
  ];
  const m = dayMacros(items, foods);
  assert.equal(m.kcal, 200);
  assert.equal(m.protein, 32);
});

test("dayMacros supports OFF snapshot fields", () => {
  const items: MealItem[] = [
    {
      id: "1",
      date: todayKey(),
      meal: "lunch",
      foodId: "custom:x",
      grams: 150,
      name: "Йогурт",
      kcal100: 80,
      protein100: 10,
      fat100: 2,
      carbs100: 8,
    },
  ];
  const m = dayMacros(items, []);
  assert.equal(m.kcal, 120);
  assert.equal(m.protein, 15);
});
