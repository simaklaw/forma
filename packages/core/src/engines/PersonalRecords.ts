/**
 * PersonalRecords — расширенные персональные рекорды по упражнениям:
 * пять типов рекордов, медали (gold/silver/bronze), «преждевременные» рекорды
 * и засуха рекордов (drought) — сколько недель без новых рекордов.
 * По мотивам открытой аналитики LiftShift (концепция PR-ленты и медалей);
 * реализация собственная, AGPL-код LiftShift не используется.
 */
import { estimateEpleyOneRm } from "./StrengthStats.ts";
import type { SetLogEntry } from "./WorkoutStats.ts";

/** Тип рекорда упражнения. */
export type RecordType =
  | "max_weight"
  | "max_reps"
  | "max_e1rm"
  | "max_set_volume"
  | "max_session_volume";

/**
 * Медаль рекорда: gold — улучшение ≥ 2%, silver — маргинальное улучшение,
 * bronze — точное повторение действующего рекорда.
 */
export type RecordTier = "gold" | "silver" | "bronze";

/** Засуха рекордов: none / mild (4–7 недель) / severe (8+ недель). */
export type DroughtLevel = "none" | "mild" | "severe";

export interface RecordEvent {
  dateKey: string;
  type: RecordType;
  tier: RecordTier;
  /** Значение рекорда: кг, повторы или кг×повторы. */
  value: number;
  /** Для max_reps — вес подхода; для остальных типов 0. */
  weightKg: number;
  /** Превышение прошлого рекорда, %; null для самого первого рекорда. */
  improvementPct: number | null;
  /** Рекорд поставлен первым подходом с резким спадом после — «на холодную». */
  premature: boolean;
}

export interface RecordBests {
  maxWeightKg: number;
  maxReps: number;
  maxOneRmKg: number;
  maxSetVolumeKg: number;
  maxSessionVolumeKg: number;
}

export interface ExerciseRecords {
  exerciseId: number;
  /** Число тренировочных дней с валидными логами. */
  sessionCount: number;
  /** Действующие рекорды за всю историю упражнения. */
  bests: RecordBests;
  /** Рекорды в хронологическом порядке. */
  events: RecordEvent[];
  /** Дата последнего нового рекорда (gold/silver); null, если их не было. */
  lastPrDateKey: string | null;
  /** Число сессий после последнего нового рекорда. */
  sessionsSinceLastPr: number;
  /** Полных недель от последнего нового рекорда до now. */
  droughtWeeks: number;
  droughtLevel: DroughtLevel;
}

/** Повторный рекорд (max_reps) считается на весе ≥ 80% от лучшего веса упражнения. */
const REPS_PR_WEIGHT_RATIO = 0.8;
/** Gold при улучшении ≥ 2%; меньшее улучшение — silver. */
const GOLD_MARGIN = 0.02;
/** «Преждевременный» рекорд: e1RM остальных подходов < 90% от рекордного. */
const PREMATURE_DROP_RATIO = 0.9;
const DROUGHT_MILD_WEEKS = 4;
const DROUGHT_SEVERE_WEEKS = 8;
/** Засуха учитывается, только если после рекорда было ≥ 2 сессий упражнения. */
const DROUGHT_MIN_SESSIONS = 2;

const DAY_MS = 24 * 60 * 60 * 1000;

function validSet(entry: SetLogEntry): boolean {
  return (
    Number.isFinite(entry.weight) &&
    Number.isFinite(entry.reps) &&
    entry.weight > 0 &&
    entry.reps > 0
  );
}

interface SessionAgg {
  dateKey: string;
  entries: SetLogEntry[];
  setCount: number;
  topWeightKg: number;
  topSetOneRm: number;
  topSetIsFirst: boolean;
  bestOneRm: number;
  bestSetIsFirst: boolean;
  bestSetVolume: number;
  volSetOneRm: number;
  volSetIsFirst: boolean;
  sessionVolume: number;
  /** Лучший e1RM среди подходов после первого; 0 при одном подходе. */
  restBestOneRm: number;
}

/** Логи одного упражнения, свёрнутые в сессии по дням (внутри дня — порядок записи). */
function sessionsOf(logs: SetLogEntry[]): SessionAgg[] {
  const byDay = new Map<string, SetLogEntry[]>();
  for (const entry of logs) {
    if (!validSet(entry)) continue;
    const list = byDay.get(entry.dateKey);
    if (list) {
      list.push(entry);
    } else {
      byDay.set(entry.dateKey, [entry]);
    }
  }
  const out: SessionAgg[] = [];
  const days = [...byDay.keys()].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  for (const dateKey of days) {
    const entries = byDay.get(dateKey)!;
    let topWeightKg = 0;
    let topSetOneRm = 0;
    let topSetIsFirst = false;
    let bestOneRm = 0;
    let bestSetIsFirst = false;
    let bestSetVolume = 0;
    let volSetOneRm = 0;
    let volSetIsFirst = false;
    let sessionVolume = 0;
    let restBestOneRm = 0;
    for (let i = 0; i < entries.length; i += 1) {
      const entry = entries[i]!;
      const oneRm = estimateEpleyOneRm(entry.weight, entry.reps);
      const volume = entry.weight * entry.reps;
      const isFirst = i === 0;
      if (entry.weight > topWeightKg || (entry.weight === topWeightKg && oneRm > topSetOneRm)) {
        topWeightKg = entry.weight;
        topSetOneRm = oneRm;
        topSetIsFirst = isFirst;
      }
      if (oneRm > bestOneRm) {
        bestOneRm = oneRm;
        bestSetIsFirst = isFirst;
      }
      if (volume > bestSetVolume) {
        bestSetVolume = volume;
        volSetOneRm = oneRm;
        volSetIsFirst = isFirst;
      }
      sessionVolume += volume;
      if (!isFirst) {
        restBestOneRm = Math.max(restBestOneRm, oneRm);
      }
    }
    out.push({
      dateKey,
      entries,
      setCount: entries.length,
      topWeightKg,
      topSetOneRm,
      topSetIsFirst,
      bestOneRm,
      bestSetIsFirst,
      bestSetVolume: Math.round(bestSetVolume * 10) / 10,
      volSetOneRm,
      volSetIsFirst,
      sessionVolume: Math.round(sessionVolume * 10) / 10,
      restBestOneRm,
    });
  }
  return out;
}

function analyzeExercise(exerciseId: number, logs: SetLogEntry[], now: Date): ExerciseRecords {
  const sessions = sessionsOf(logs);
  const bests: RecordBests = {
    maxWeightKg: 0,
    maxReps: 0,
    maxOneRmKg: 0,
    maxSetVolumeKg: 0,
    maxSessionVolumeKg: 0,
  };
  const events: RecordEvent[] = [];

  /** Сравнивает результат сессии с прошлым рекордом; добавляет событие при рекорде или повторении. */
  const check = (
    dateKey: string,
    type: RecordType,
    next: number,
    prev: number,
    premature: boolean,
    weightKg: number = 0,
  ): void => {
    if (prev === 0) {
      if (next > 0) {
        events.push({
          dateKey,
          type,
          tier: "gold",
          value: next,
          weightKg,
          improvementPct: null,
          premature,
        });
      }
      return;
    }
    if (next > prev) {
      const ratio = (next - prev) / prev;
      events.push({
        dateKey,
        type,
        tier: ratio >= GOLD_MARGIN ? "gold" : "silver",
        value: next,
        weightKg,
        improvementPct: Math.round(ratio * 1000) / 10,
        premature,
      });
      return;
    }
    if (next === prev) {
      events.push({
        dateKey,
        type,
        tier: "bronze",
        value: next,
        weightKg,
        improvementPct: 0,
        premature: false,
      });
    }
  };

  for (const session of sessions) {
    const prematureFor = (prOneRm: number, isFirst: boolean): boolean =>
      session.setCount > 1 && isFirst && session.restBestOneRm < PREMATURE_DROP_RATIO * prOneRm;

    // Кандидат на повторный рекорд: вес ≥ 80% от лучшего на момент до сессии.
    const threshold = bests.maxWeightKg * REPS_PR_WEIGHT_RATIO;
    let repsCandidate: { reps: number; weight: number; oneRm: number; isFirst: boolean } | null =
      null;
    for (let i = 0; i < session.entries.length; i += 1) {
      const entry = session.entries[i]!;
      if (entry.weight < threshold) continue;
      if (repsCandidate === null || entry.reps > repsCandidate.reps) {
        repsCandidate = {
          reps: entry.reps,
          weight: entry.weight,
          oneRm: estimateEpleyOneRm(entry.weight, entry.reps),
          isFirst: i === 0,
        };
      }
    }

    check(
      session.dateKey,
      "max_weight",
      session.topWeightKg,
      bests.maxWeightKg,
      prematureFor(session.topSetOneRm, session.topSetIsFirst),
    );
    if (repsCandidate !== null) {
      check(
        session.dateKey,
        "max_reps",
        repsCandidate.reps,
        bests.maxReps,
        prematureFor(repsCandidate.oneRm, repsCandidate.isFirst),
        repsCandidate.weight,
      );
    }
    check(
      session.dateKey,
      "max_e1rm",
      session.bestOneRm,
      bests.maxOneRmKg,
      prematureFor(session.bestOneRm, session.bestSetIsFirst),
    );
    check(
      session.dateKey,
      "max_set_volume",
      session.bestSetVolume,
      bests.maxSetVolumeKg,
      prematureFor(session.volSetOneRm, session.volSetIsFirst),
    );
    check(session.dateKey, "max_session_volume", session.sessionVolume, bests.maxSessionVolumeKg, false);

    bests.maxWeightKg = Math.max(bests.maxWeightKg, session.topWeightKg);
    if (repsCandidate !== null) {
      bests.maxReps = Math.max(bests.maxReps, repsCandidate.reps);
    }
    bests.maxOneRmKg = Math.max(bests.maxOneRmKg, session.bestOneRm);
    bests.maxSetVolumeKg = Math.max(bests.maxSetVolumeKg, session.bestSetVolume);
    bests.maxSessionVolumeKg = Math.max(bests.maxSessionVolumeKg, session.sessionVolume);
  }

  // Последний «новый» рекорд — bronze-повторения засуху не сбрасывают.
  let lastNew: RecordEvent | null = null;
  for (let i = events.length - 1; i >= 0; i -= 1) {
    if (events[i]!.tier !== "bronze") {
      lastNew = events[i]!;
      break;
    }
  }
  const lastPrDateKey = lastNew !== null ? lastNew.dateKey : null;
  const sessionsSinceLastPr =
    lastPrDateKey !== null ? sessions.filter((s) => s.dateKey > lastPrDateKey).length : 0;

  let droughtWeeks = 0;
  if (lastPrDateKey !== null) {
    const prMs = Date.parse(lastPrDateKey + "T00:00:00Z");
    const diff = now.getTime() - prMs;
    if (Number.isFinite(diff) && diff > 0) {
      droughtWeeks = Math.floor(diff / (7 * DAY_MS));
    }
  }

  let droughtLevel: DroughtLevel = "none";
  if (lastPrDateKey !== null && sessionsSinceLastPr >= DROUGHT_MIN_SESSIONS) {
    if (droughtWeeks >= DROUGHT_SEVERE_WEEKS) {
      droughtLevel = "severe";
    } else if (droughtWeeks >= DROUGHT_MILD_WEEKS) {
      droughtLevel = "mild";
    }
  }

  return {
    exerciseId,
    sessionCount: sessions.length,
    bests,
    events,
    lastPrDateKey,
    sessionsSinceLastPr,
    droughtWeeks,
    droughtLevel,
  };
}

/**
 * Рекорды и PR-лента для каждого упражнения с валидными логами.
 * Сортировка: у кого рекорд свежее — тот выше.
 */
export function personalRecords(
  setLogs: SetLogEntry[],
  now: Date = new Date(),
): ExerciseRecords[] {
  const byExercise = new Map<number, SetLogEntry[]>();
  for (const entry of setLogs) {
    const list = byExercise.get(entry.exerciseId);
    if (list) {
      list.push(entry);
    } else {
      byExercise.set(entry.exerciseId, [entry]);
    }
  }
  const out: ExerciseRecords[] = [];
  for (const [exerciseId, logs] of byExercise) {
    const records = analyzeExercise(exerciseId, logs, now);
    if (records.sessionCount === 0) continue;
    out.push(records);
  }
  return out.sort((a, b) => {
    const aKey = a.lastPrDateKey ?? "";
    const bKey = b.lastPrDateKey ?? "";
    if (aKey !== bKey) return aKey < bKey ? 1 : -1;
    return a.exerciseId - b.exerciseId;
  });
}
