export type Equipment = "bands" | "dumbbells" | "pullup" | "chair";
export type Goal = "strength" | "tone" | "energy" | "recovery";
export type Presentation = "man" | "woman" | "neutral";
export type ThemeMode = "light" | "dark" | "system";
export type MealType = "breakfast" | "lunch" | "dinner" | "snack";
export type RepUnit = "rep" | "sec";
export type MuscleRegion =
  | "legs"
  | "glutes"
  | "chest"
  | "core"
  | "back"
  | "shoulders"
  | "arms";

export type Exercise = {
  id: string;
  name: string;
  muscles: string[];
  regions: MuscleRegion[];
  equipment: Equipment[];
  jumps: boolean;
  sets: number;
  reps: number;
  unit: RepUnit;
  restSec: number;
  cues: string[];
  poster: string;
  video: string;
};

export type Plan = {
  id: string;
  title: string;
  minutes: 8 | 15 | 25 | 40;
  focus: string;
  muscles: string[];
  jumps: boolean;
  exerciseIds: string[];
  goals: Goal[];
  optional?: boolean;
};

export type Food = {
  id: string;
  name: string;
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
};

export type Profile = {
  name: string;
  presentation: Presentation;
  goal: Goal;
  equipment: Equipment[];
  minutes: 15 | 25 | 40;
  days: number[];
  heightCm: number;
  weightKg: number;
  age: number;
  calorieGoal: number;
  proteinGoal: number;
  fatGoal: number;
  carbsGoal: number;
  onboarded: boolean;
  theme: ThemeMode;
};

export type WorkoutLog = {
  date: string;
  planId: string;
  completed: boolean;
  regions: MuscleRegion[];
};

export type MealItem = {
  id: string;
  date: string;
  meal: MealType;
  foodId: string;
  grams: number;
};

export type WeightEntry = { date: string; kg: number };
export type MeasurementEntry = { date: string; waist: number };

export type Session = {
  planId: string;
  exerciseIndex: number;
  setsDone: Record<string, boolean[]>;
  restEndsAt: number | null;
  startedAt: number;
};

export type Macros = { kcal: number; protein: number; fat: number; carbs: number };
