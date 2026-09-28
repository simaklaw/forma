import type { MuscleKey } from '@/components/MuscleMap';
import { CATALOGS } from './catalog';

const MUSCLE_KEYS = new Set<MuscleKey>([
  'chest',
  'shoulders',
  'biceps',
  'triceps',
  'core',
  'quads',
  'hamstrings',
  'glutes',
  'lowerback',
  'back',
  'calves'
]);

/** Frozen ids 1–30 — do not rename or reassign. */
const FROZEN_IDS: Record<number, string> = {
  1: 'Приседания со штангой',
  2: 'Становая тяга',
  3: 'Выпады с гантелями',
  4: 'Жим штанги лёжа',
  5: 'Жим гантелей сидя',
  6: 'Разгибания на трицепс на блоке',
  7: 'Тяга штанги в наклоне',
  8: 'Тяга верхнего блока',
  9: 'Сгибания на бицепс со штангой',
  10: 'Отжимания',
  11: 'Подтягивания',
  12: 'Тяга с резиной',
  13: 'Приседания',
  14: 'Выпады',
  15: 'Планка',
  16: 'Мёртвый жук',
  17: 'Боковая планка',
  18: 'Отжимания от стула',
  19: 'Жим над головой с резиной',
  20: 'Ягодичный мостик',
  21: 'Ягодичный мостик с опорой',
  22: 'Приседания со штангой',
  23: 'Жим гантелей лёжа',
  24: 'Тяга гантели в наклоне',
  25: 'Жим штанги лёжа',
  26: 'Тяга гантели в наклоне',
  27: 'Разведение гантелей в стороны',
  28: 'Приседания со штангой',
  29: 'Румынская тяга',
  30: 'Выпады с гантелями'
};

describe('catalog integrity', () => {
  const allDays = [...CATALOGS.gym, ...CATALOGS.home];
  const allExercises = allDays.flatMap((day) => day.exercises);

  it('keeps ids 1–30 with frozen names', () => {
    for (const [idRaw, name] of Object.entries(FROZEN_IDS)) {
      const id = Number(idRaw);
      const match = allExercises.find((ex) => ex.id === id);
      expect(match).toBeDefined();
      expect(match?.name).toBe(name);
    }
  });

  it('has unique ids within each day', () => {
    for (const day of allDays) {
      const ids = day.exercises.map((ex) => ex.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('requires name, valid muscles, and positive load fields', () => {
    for (const ex of allExercises) {
      expect(ex.name.trim().length).toBeGreaterThan(0);
      expect(ex.totalSets).toBeGreaterThan(0);
      expect(ex.workingReps).toBeGreaterThan(0);
      expect(ex.restSeconds).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(ex.workingWeight)).toBe(true);
      expect(ex.workingWeight).toBeGreaterThanOrEqual(0);
      expect(ex.targetMuscles.length).toBeGreaterThan(0);
      for (const muscle of ex.targetMuscles) {
        expect(MUSCLE_KEYS.has(muscle)).toBe(true);
      }
    }
  });

  it('attaches a wger search term for photo lookup', () => {
    for (const ex of allExercises) {
      expect((ex.wgerSearchTerm ?? '').trim().length).toBeGreaterThan(0);
    }
  });
});
