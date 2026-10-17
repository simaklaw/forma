/**
 * Готовые программы (Фаза 4, issue #159): три шаблона по целям — сила,
 * жиросжигание, выносливость — по 7 дней, поверх движка программ Фазы 3.
 *
 * Ссылки упражнений: refId — нативный id каталога (замороженные 1–30,
 * домашние 10–21/48–62), libRef — lib-id импортированной библиотеки.
 * Неразрешённые ссылки defensively пропускаются, но тесты требуют,
 * чтобы разрешались все. Имена дней и фокусы — RU-контент плана,
 * как в bodyweightPlan/gymPlan (не i18n).
 */
import type { MuscleKey } from '@/domain/muscleKeys';
import type { ExerciseDef } from '../ExerciseSheet';
import { CATALOGS, type WorkoutDay } from '../catalog';
import {
  importedExerciseDefByNumericId,
  numericIdForImportedLibId
} from '../importedExerciseBridge';

export type ProgramTemplateId = 'strength-home' | 'fatloss-home' | 'endurance-home';
export type ProgramTemplateGoal = 'strength' | 'fatloss' | 'endurance';
export type ReadyProgramLevel = 'beginner' | 'intermediate' | 'expert';

export const READY_PROGRAM_IDS: readonly ProgramTemplateId[] = [
  'strength-home',
  'fatloss-home',
  'endurance-home'
];

export const READY_PROGRAM_LEVELS: readonly ReadyProgramLevel[] = [
  'beginner',
  'intermediate',
  'expert'
];

export function isProgramTemplateId(value: unknown): value is ProgramTemplateId {
  return typeof value === 'string' && (READY_PROGRAM_IDS as readonly string[]).includes(value);
}

export function isReadyProgramLevel(value: unknown): value is ReadyProgramLevel {
  return typeof value === 'string' && (READY_PROGRAM_LEVELS as readonly string[]).includes(value);
}

interface TemplateExerciseRef {
  /** Нативный id каталога. */
  refId?: number;
  /** lib-id из importedExerciseLibrary.generated ('lib-…'). */
  libRef?: string;
  totalSets: number;
  workingReps: number;
  restSeconds: number;
}

interface TemplateDay {
  /** Русский фокус дня — контент плана, не i18n. */
  focusName: string;
  focusMuscles: MuscleKey[];
  exercises: TemplateExerciseRef[];
}

export interface ProgramTemplate {
  id: ProgramTemplateId;
  goal: ProgramTemplateGoal;
  days: TemplateDay[];
}

const TEMPLATES: Record<ProgramTemplateId, ProgramTemplate> = {
  'strength-home': {
    id: 'strength-home',
    goal: 'strength',
    days: [
      {
        focusName: 'Грудь и трицепс',
        focusMuscles: ['chest', 'triceps'],
        exercises: [
          { refId: 10, totalSets: 4, workingReps: 10, restSeconds: 90 },
          { refId: 48, totalSets: 3, workingReps: 8, restSeconds: 90 },
          { refId: 49, totalSets: 3, workingReps: 8, restSeconds: 90 },
          { libRef: 'lib-jackknife-sit-up', totalSets: 3, workingReps: 12, restSeconds: 60 }
        ]
      },
      {
        focusName: 'Спина и руки',
        focusMuscles: ['back', 'biceps'],
        exercises: [
          { refId: 11, totalSets: 4, workingReps: 6, restSeconds: 120 },
          { refId: 50, totalSets: 3, workingReps: 10, restSeconds: 90 },
          { refId: 12, totalSets: 3, workingReps: 12, restSeconds: 75 },
          { refId: 18, totalSets: 3, workingReps: 10, restSeconds: 90 }
        ]
      },
      {
        focusName: 'Ноги и ягодицы',
        focusMuscles: ['quads', 'glutes'],
        exercises: [
          { refId: 13, totalSets: 4, workingReps: 15, restSeconds: 90 },
          { refId: 51, totalSets: 3, workingReps: 10, restSeconds: 90 },
          { refId: 21, totalSets: 3, workingReps: 12, restSeconds: 75 },
          { libRef: 'lib-calf-raises-with-bands', totalSets: 3, workingReps: 15, restSeconds: 45 }
        ]
      },
      {
        focusName: 'Кор и плечи',
        focusMuscles: ['shoulders', 'core'],
        exercises: [
          { refId: 19, totalSets: 3, workingReps: 10, restSeconds: 75 },
          { refId: 55, totalSets: 3, workingReps: 8, restSeconds: 75 },
          { refId: 15, totalSets: 3, workingReps: 40, restSeconds: 60 },
          { refId: 16, totalSets: 3, workingReps: 12, restSeconds: 60 }
        ]
      },
      {
        focusName: 'Верх тела: объём',
        focusMuscles: ['chest', 'back'],
        exercises: [
          { refId: 10, totalSets: 3, workingReps: 12, restSeconds: 75 },
          { refId: 49, totalSets: 3, workingReps: 10, restSeconds: 90 },
          { refId: 12, totalSets: 3, workingReps: 15, restSeconds: 75 },
          { refId: 53, totalSets: 3, workingReps: 15, restSeconds: 60 }
        ]
      },
      {
        focusName: 'Ноги и мостик',
        focusMuscles: ['quads', 'glutes'],
        exercises: [
          { refId: 14, totalSets: 3, workingReps: 12, restSeconds: 75 },
          { refId: 52, totalSets: 3, workingReps: 10, restSeconds: 90 },
          { refId: 20, totalSets: 3, workingReps: 15, restSeconds: 75 },
          { refId: 57, totalSets: 3, workingReps: 12, restSeconds: 60 }
        ]
      },
      {
        focusName: 'Всё тело',
        focusMuscles: ['chest', 'quads', 'core'],
        exercises: [
          { refId: 13, totalSets: 3, workingReps: 12, restSeconds: 75 },
          { refId: 10, totalSets: 3, workingReps: 10, restSeconds: 75 },
          { refId: 50, totalSets: 3, workingReps: 8, restSeconds: 90 },
          { refId: 15, totalSets: 3, workingReps: 40, restSeconds: 60 }
        ]
      }
    ]
  },

  'fatloss-home': {
    id: 'fatloss-home',
    goal: 'fatloss',
    days: [
      {
        focusName: 'Интервалы: всё тело',
        focusMuscles: ['quads', 'core'],
        exercises: [
          { libRef: 'lib-freehand-jump-squat', totalSets: 4, workingReps: 15, restSeconds: 45 },
          { refId: 10, totalSets: 3, workingReps: 12, restSeconds: 45 },
          { libRef: 'lib-star-jump', totalSets: 3, workingReps: 30, restSeconds: 30 },
          { libRef: 'lib-air-bike', totalSets: 3, workingReps: 20, restSeconds: 30 }
        ]
      },
      {
        focusName: 'Ноги и кардио',
        focusMuscles: ['quads', 'glutes'],
        exercises: [
          { refId: 13, totalSets: 4, workingReps: 20, restSeconds: 40 },
          { refId: 14, totalSets: 3, workingReps: 12, restSeconds: 45 },
          { libRef: 'lib-knee-tuck-jump', totalSets: 3, workingReps: 12, restSeconds: 45 },
          { libRef: 'lib-fast-skipping', totalSets: 3, workingReps: 30, restSeconds: 30 }
        ]
      },
      {
        focusName: 'Верх тела',
        focusMuscles: ['chest', 'back'],
        exercises: [
          { refId: 10, totalSets: 3, workingReps: 12, restSeconds: 45 },
          { refId: 12, totalSets: 3, workingReps: 15, restSeconds: 45 },
          { refId: 19, totalSets: 3, workingReps: 12, restSeconds: 45 },
          { libRef: 'lib-groiners', totalSets: 3, workingReps: 10, restSeconds: 30 }
        ]
      },
      {
        focusName: 'Пресс и кор',
        focusMuscles: ['core'],
        exercises: [
          { libRef: 'lib-air-bike', totalSets: 3, workingReps: 20, restSeconds: 30 },
          { refId: 53, totalSets: 3, workingReps: 15, restSeconds: 40 },
          { libRef: 'lib-scissor-kick', totalSets: 3, workingReps: 16, restSeconds: 30 },
          { refId: 15, totalSets: 3, workingReps: 40, restSeconds: 45 }
        ]
      },
      {
        focusName: 'Кардио-интервалы',
        focusMuscles: ['quads', 'calves'],
        exercises: [
          { libRef: 'lib-star-jump', totalSets: 4, workingReps: 30, restSeconds: 30 },
          { libRef: 'lib-knee-tuck-jump', totalSets: 3, workingReps: 10, restSeconds: 45 },
          { libRef: 'lib-freehand-jump-squat', totalSets: 3, workingReps: 12, restSeconds: 45 },
          { libRef: 'lib-fast-skipping', totalSets: 3, workingReps: 30, restSeconds: 30 }
        ]
      },
      {
        focusName: 'Ягодицы и бёдра',
        focusMuscles: ['glutes', 'hamstrings'],
        exercises: [
          { refId: 20, totalSets: 3, workingReps: 15, restSeconds: 45 },
          { refId: 51, totalSets: 3, workingReps: 10, restSeconds: 45 },
          { libRef: 'lib-calf-raises-with-bands', totalSets: 3, workingReps: 20, restSeconds: 30 },
          { refId: 56, totalSets: 3, workingReps: 12, restSeconds: 40 }
        ]
      },
      {
        focusName: 'Круговая: всё тело',
        focusMuscles: ['chest', 'quads', 'core'],
        exercises: [
          { refId: 10, totalSets: 3, workingReps: 12, restSeconds: 40 },
          { refId: 13, totalSets: 3, workingReps: 15, restSeconds: 40 },
          { libRef: 'lib-groiners', totalSets: 3, workingReps: 12, restSeconds: 30 },
          { libRef: 'lib-jackknife-sit-up', totalSets: 3, workingReps: 15, restSeconds: 30 }
        ]
      }
    ]
  },

  'endurance-home': {
    id: 'endurance-home',
    goal: 'endurance',
    days: [
      {
        focusName: 'Верх: выносливость',
        focusMuscles: ['chest', 'back'],
        exercises: [
          { refId: 10, totalSets: 4, workingReps: 15, restSeconds: 45 },
          { refId: 50, totalSets: 4, workingReps: 12, restSeconds: 45 },
          { refId: 12, totalSets: 3, workingReps: 15, restSeconds: 40 }
        ]
      },
      {
        focusName: 'Ноги: выносливость',
        focusMuscles: ['quads', 'glutes'],
        exercises: [
          { refId: 13, totalSets: 4, workingReps: 25, restSeconds: 40 },
          { refId: 14, totalSets: 3, workingReps: 14, restSeconds: 40 },
          { refId: 57, totalSets: 3, workingReps: 16, restSeconds: 40 },
          { libRef: 'lib-calf-raises-with-bands', totalSets: 3, workingReps: 20, restSeconds: 30 }
        ]
      },
      {
        focusName: 'Кардио',
        focusMuscles: ['quads', 'calves'],
        exercises: [
          { libRef: 'lib-fast-skipping', totalSets: 4, workingReps: 40, restSeconds: 30 },
          { libRef: 'lib-star-jump', totalSets: 3, workingReps: 30, restSeconds: 30 },
          { libRef: 'lib-knee-tuck-jump', totalSets: 3, workingReps: 12, restSeconds: 45 }
        ]
      },
      {
        focusName: 'Кор',
        focusMuscles: ['core'],
        exercises: [
          { refId: 15, totalSets: 3, workingReps: 50, restSeconds: 45 },
          { refId: 16, totalSets: 3, workingReps: 14, restSeconds: 40 },
          { libRef: 'lib-air-bike', totalSets: 3, workingReps: 24, restSeconds: 30 },
          { libRef: 'lib-scissor-kick', totalSets: 3, workingReps: 18, restSeconds: 30 }
        ]
      },
      {
        focusName: 'Плечи и руки',
        focusMuscles: ['shoulders', 'triceps'],
        exercises: [
          { refId: 19, totalSets: 3, workingReps: 14, restSeconds: 40 },
          { refId: 18, totalSets: 3, workingReps: 12, restSeconds: 45 },
          { refId: 48, totalSets: 3, workingReps: 12, restSeconds: 45 },
          { refId: 55, totalSets: 3, workingReps: 10, restSeconds: 45 }
        ]
      },
      {
        focusName: 'Ягодицы и бёдра',
        focusMuscles: ['glutes', 'hamstrings'],
        exercises: [
          { refId: 21, totalSets: 3, workingReps: 16, restSeconds: 40 },
          { refId: 56, totalSets: 3, workingReps: 14, restSeconds: 40 },
          { refId: 51, totalSets: 3, workingReps: 10, restSeconds: 45 },
          { refId: 52, totalSets: 3, workingReps: 10, restSeconds: 45 }
        ]
      },
      {
        focusName: 'Всё тело',
        focusMuscles: ['quads', 'chest', 'core'],
        exercises: [
          { refId: 13, totalSets: 3, workingReps: 20, restSeconds: 40 },
          { refId: 10, totalSets: 3, workingReps: 12, restSeconds: 40 },
          { libRef: 'lib-freehand-jump-squat', totalSets: 3, workingReps: 12, restSeconds: 45 },
          { libRef: 'lib-jackknife-sit-up', totalSets: 3, workingReps: 15, restSeconds: 30 }
        ]
      }
    ]
  }
};

export const READY_PROGRAMS: readonly ProgramTemplate[] = READY_PROGRAM_IDS.map(
  (id) => TEMPLATES[id]
);

export function templateById(id: ProgramTemplateId): ProgramTemplate {
  return TEMPLATES[id];
}

/** Уровень: новичок — подход −1 и отдых +15 с; эксперт — подход +1, отдых −15 с. */
export function applyProgramLevel(
  ref: TemplateExerciseRef,
  level: ReadyProgramLevel
): TemplateExerciseRef {
  if (level === 'beginner') {
    return {
      ...ref,
      totalSets: Math.max(1, ref.totalSets - 1),
      restSeconds: ref.restSeconds + 15
    };
  }
  if (level === 'expert') {
    return {
      ...ref,
      totalSets: ref.totalSets + 1,
      restSeconds: Math.max(15, ref.restSeconds - 15)
    };
  }
  return ref;
}

function resolveRef(ref: TemplateExerciseRef): ExerciseDef | null {
  let def: ExerciseDef | null = null;
  if (typeof ref.refId === 'number') {
    const native =
      CATALOGS.gym.flatMap((day) => day.exercises).find((ex) => ex.id === ref.refId) ??
      CATALOGS.home.flatMap((day) => day.exercises).find((ex) => ex.id === ref.refId);
    def = native ?? null;
  } else if (typeof ref.libRef === 'string') {
    const numericId = numericIdForImportedLibId(ref.libRef);
    def = numericId == null ? null : importedExerciseDefByNumericId(numericId);
  }
  return def;
}

/** Примерная длительность дня в минутах (для meta, RU-контент). */
function estimateMinutes(exercises: TemplateExerciseRef[]): number {
  const seconds = exercises.reduce(
    (sum, ex) => sum + ex.totalSets * (ex.restSeconds + Math.max(30, ex.workingReps * 3)),
    0
  );
  return Math.max(15, Math.round(seconds / 60 / 5) * 5);
}

/**
 * Собрать план недели (7 дней) из шаблона с поправкой на уровень.
 * Неразрешённые ссылки пропускаются; тесты гарантируют, что в датасете
 * на main их нет.
 */
export function readyProgramDays(
  templateId: ProgramTemplateId,
  level: ReadyProgramLevel = 'intermediate'
): WorkoutDay[] {
  const template = TEMPLATES[templateId];
  return template.days.map((day, dayIndex) => {
    const exercises = day.exercises
      .map((ref) => applyProgramLevel(ref, level))
      .map((ref) => {
        const def = resolveRef(ref);
        return def
          ? {
              ...def,
              index: 0,
              totalSets: ref.totalSets,
              workingReps: ref.workingReps,
              restSeconds: ref.restSeconds
            }
          : null;
      })
      .filter((ex): ex is ExerciseDef => ex != null)
      .map((ex, i) => ({ ...ex, index: i + 1 }));
    return {
      id: `tpl-${templateId}-${dayIndex + 1}`,
      name: `День ${dayIndex + 1} · ${day.focusName}`,
      meta: `≈${estimateMinutes(day.exercises)} мин`,
      exercises
    };
  });
}
