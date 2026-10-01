/**
 * Achievements + streak — pure helpers (no I/O).
 */

export type AchievementId =
  | "first_session"
  | "streak_3"
  | "streak_7"
  | "ten_sessions"
  | "protein_day"
  | "rest_respected";

export type Achievement = {
  id: AchievementId;
  title: string;
  hint: string;
  unlocked: boolean;
};

export type AchievementWorkout = { date: string; completed: boolean };

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function calculateStreakStats(
  workouts: AchievementWorkout[],
  now: Date = new Date(),
): { currentStreak: number; daysLogged: number } {
  const dates = new Set(workouts.filter((w) => w.completed).map((w) => w.date));
  const today = dateKey(now);
  let current = 0;
  const d = new Date(now);
  for (;;) {
    const k = dateKey(d);
    if (!dates.has(k)) {
      if (current === 0 && k === today) {
        d.setDate(d.getDate() - 1);
        continue;
      }
      break;
    }
    current += 1;
    d.setDate(d.getDate() - 1);
  }
  return { currentStreak: current, daysLogged: dates.size };
}

export function evaluateAchievements(input: {
  workouts: AchievementWorkout[];
  proteinTodayG?: number;
  proteinGoalG?: number | null;
  restDay?: boolean;
  doneToday?: boolean;
  now?: Date;
}): Achievement[] {
  const completed = input.workouts.filter((w) => w.completed).length;
  const streak = calculateStreakStats(input.workouts, input.now).currentStreak;
  const proteinClosed =
    input.proteinGoalG != null &&
    input.proteinGoalG > 0 &&
    (input.proteinTodayG ?? 0) >= input.proteinGoalG * 0.9;

  return [
    {
      id: "first_session",
      title: "Первый подход",
      hint: "Закрой любую тренировку",
      unlocked: completed >= 1,
    },
    {
      id: "streak_3",
      title: "Три дня",
      hint: "Серия из 3 тренировочных дней",
      unlocked: streak >= 3,
    },
    {
      id: "streak_7",
      title: "Неделя ритма",
      hint: "7 дней серии",
      unlocked: streak >= 7,
    },
    {
      id: "ten_sessions",
      title: "Десять сессий",
      hint: "10 закрытых тренировок",
      unlocked: completed >= 10,
    },
    {
      id: "protein_day",
      title: "Белок закрыт",
      hint: "≥90% белковой цели сегодня",
      unlocked: Boolean(proteinClosed),
    },
    {
      id: "rest_respected",
      title: "Умный отдых",
      hint: "Rest day без геройства",
      unlocked: Boolean(input.restDay && !input.doneToday),
    },
  ];
}
