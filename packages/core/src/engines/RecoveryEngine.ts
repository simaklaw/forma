/**
 * RecoveryEngine — pure recovery score from training load + intake (no I/O).
 */

export type RecoveryStatus =
  | "peak"
  | "ready"
  | "active_recovery_recommended"
  | "rest_required";

export type RecoveryActivity = {
  id: string;
  title: string;
  durationMinutes: number;
  category: "mobility" | "aerobic" | "stretching" | "myofascial";
  description: string;
};

export type RecoveryInsight = {
  recoveryScore: number;
  status: RecoveryStatus;
  statusLabel: string;
  recommendationTitle: string;
  recommendationDescription: string;
  optimalRestDay: string;
  muscularReadiness: number;
  energyRestoration: number;
  hydrationScore: number;
  cnsFreshness: number;
  consecutiveTrainingDays: number;
  workoutsInLast7Days: number;
  proteinAdequacyPct: number;
  calorieBalancePct: number;
  waterAdequacyPct: number;
  suggestedActivities: RecoveryActivity[];
  nutritionAdvice: string;
};

export type RecoveryWorkout = { date: string; completed: boolean };

export type AnalyzeRecoveryInput = {
  workouts: RecoveryWorkout[];
  intakeKcal?: number;
  intakeProteinG?: number;
  targetKcal?: number;
  targetProteinG?: number;
  waterLogsMl?: number;
  waterGoalMl?: number;
  now?: Date;
};

const ACTIVITIES: RecoveryActivity[] = [
  {
    id: "mobility-flow",
    title: "Суставная мобильность",
    durationMinutes: 15,
    category: "mobility",
    description: "Вращения плеч и бёдер, «кошка-собака».",
  },
  {
    id: "zone1-walk",
    title: "Прогулка в зоне 1",
    durationMinutes: 30,
    category: "aerobic",
    description: "Спокойная ходьба без одышки.",
  },
  {
    id: "mfr-roll",
    title: "МФР валиком",
    durationMinutes: 15,
    category: "myofascial",
    description: "Икры, квадрицепс, ягодицы.",
  },
  {
    id: "deep-stretching",
    title: "Стретчинг и дыхание",
    durationMinutes: 20,
    category: "stretching",
    description: "Удержание 40–60 с, медленный выдох.",
  },
  {
    id: "contrast-recovery",
    title: "Контрастный душ",
    durationMinutes: 10,
    category: "aerobic",
    description: "Тепло / прохлада, 3–4 цикла.",
  },
];

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function analyzeRecovery(input: AnalyzeRecoveryInput): RecoveryInsight {
  const now = input.now ?? new Date();
  const today = dateKey(now);
  const completedDates = input.workouts.filter((w) => w.completed).map((w) => w.date);

  let consecutiveDays = 0;
  const cursor = new Date(now);
  if (completedDates.includes(today)) {
    consecutiveDays = 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  for (;;) {
    const key = dateKey(cursor);
    if (completedDates.includes(key)) {
      consecutiveDays += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else break;
  }

  const last7: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    last7.push(dateKey(d));
  }
  const workoutsInLast7Days = input.workouts.filter(
    (w) => w.completed && last7.includes(w.date),
  ).length;

  const targetKcal = input.targetKcal ?? 2200;
  const targetProtein = input.targetProteinG ?? 140;
  const intakeKcal = input.intakeKcal ?? 0;
  const intakeProtein = input.intakeProteinG ?? 0;
  const waterMl = input.waterLogsMl ?? 0;
  const waterGoal = input.waterGoalMl ?? 2500;

  const calorieBalancePct = clamp(
    Math.round((intakeKcal / Math.max(1, targetKcal)) * 100),
    0,
    130,
  );
  const proteinAdequacyPct = clamp(
    Math.round((intakeProtein / Math.max(1, targetProtein)) * 100),
    0,
    130,
  );
  const waterAdequacyPct = clamp(
    Math.round((waterMl / Math.max(1, waterGoal)) * 100),
    0,
    130,
  );

  let muscularReadiness =
    95 - consecutiveDays * 14 - Math.max(0, workoutsInLast7Days - 3) * 6;
  if (proteinAdequacyPct >= 90) muscularReadiness += 8;
  else if (proteinAdequacyPct < 50) muscularReadiness -= 10;
  muscularReadiness = clamp(muscularReadiness, 20, 100);

  let energyRestoration = 88;
  if (calorieBalancePct < 60) energyRestoration -= 20;
  else if (calorieBalancePct >= 90 && calorieBalancePct <= 110) energyRestoration += 8;
  if (consecutiveDays >= 3) energyRestoration -= 15;
  energyRestoration = clamp(energyRestoration, 25, 100);

  const hydrationScore = clamp(Math.round(waterAdequacyPct * 0.9 + 10), 25, 100);

  let cnsFreshness = 100 - consecutiveDays * 16;
  if (workoutsInLast7Days >= 5) cnsFreshness -= 15;
  cnsFreshness = clamp(cnsFreshness, 25, 100);

  const recoveryScore = Math.round(
    muscularReadiness * 0.35 +
      energyRestoration * 0.25 +
      cnsFreshness * 0.25 +
      hydrationScore * 0.15,
  );

  let status: RecoveryStatus;
  let statusLabel: string;
  let recommendationTitle: string;
  let recommendationDescription: string;
  let suggestedActivities: RecoveryActivity[];

  if (consecutiveDays >= 4 || recoveryScore < 45) {
    status = "rest_required";
    statusLabel = "Нужен отдых";
    recommendationTitle = "Полный rest day";
    recommendationDescription = `Уже ${consecutiveDays || 0} дней нагрузки подряд. Сегодня без силовых.`;
    suggestedActivities = [ACTIVITIES[3], ACTIVITIES[4]];
  } else if (consecutiveDays >= 2 || recoveryScore < 70) {
    status = "active_recovery_recommended";
    statusLabel = "Разгрузка";
    recommendationTitle = "Активное восстановление";
    recommendationDescription = "Мобильность, прогулка или МФР вместо тяжёлой силовой.";
    suggestedActivities = [ACTIVITIES[0], ACTIVITIES[1], ACTIVITIES[2]];
  } else if (recoveryScore < 85) {
    status = "ready";
    statusLabel = "Готов";
    recommendationTitle = "Плановая силовая";
    recommendationDescription = "Мышцы восстановились. Держи темп и разминку.";
    suggestedActivities = [ACTIVITIES[0]];
  } else {
    status = "peak";
    statusLabel = "Пик";
    recommendationTitle = "Суперкомпенсация";
    recommendationDescription = "ЦНС и гликоген перезаряжены. День для рабочих подходов.";
    suggestedActivities = [ACTIVITIES[0]];
  }

  const weekdays = [
    "воскресенье",
    "понедельник",
    "вторник",
    "среда",
    "четверг",
    "пятница",
    "суббота",
  ];
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const inTwo = new Date(now);
  inTwo.setDate(inTwo.getDate() + 2);
  const optimalRestDay =
    consecutiveDays >= 3
      ? `завтра (${weekdays[tomorrow.getDay()]})`
      : consecutiveDays >= 2
        ? weekdays[inTwo.getDay()]
        : `через 2–3 дня (${weekdays[(now.getDay() + 3) % 7]})`;

  let nutritionAdvice: string;
  if (proteinAdequacyPct < 70) {
    nutritionAdvice = `Белок ${proteinAdequacyPct}%. Добавь белковый приём пищи.`;
  } else if (waterAdequacyPct < 60) {
    nutritionAdvice = `Вода ${waterAdequacyPct}%. Ещё 2–3 стакана до вечера.`;
  } else {
    nutritionAdvice = "Нутриенты и вода в норме для восстановления.";
  }

  return {
    recoveryScore,
    status,
    statusLabel,
    recommendationTitle,
    recommendationDescription,
    optimalRestDay,
    muscularReadiness,
    energyRestoration,
    hydrationScore,
    cnsFreshness,
    consecutiveTrainingDays: consecutiveDays,
    workoutsInLast7Days,
    proteinAdequacyPct,
    calorieBalancePct,
    waterAdequacyPct,
    suggestedActivities,
    nutritionAdvice,
  };
}
