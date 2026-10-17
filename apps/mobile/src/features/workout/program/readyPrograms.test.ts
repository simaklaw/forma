import {
  READY_PROGRAMS,
  applyProgramLevel,
  isProgramTemplateId,
  isReadyProgramLevel,
  readyProgramDays,
  templateById,
  type ReadyProgramLevel
} from './readyPrograms';
import { CATALOGS } from '../catalog';
import { IMPORTED_EXERCISE_LIBRARY } from '../importedExerciseLibrary.generated';

const LEVELS: readonly ReadyProgramLevel[] = ['beginner', 'intermediate', 'expert'];

describe('readyPrograms', () => {
  it('has three templates with distinct goals and ids', () => {
    expect(READY_PROGRAMS).toHaveLength(3);
    expect(new Set(READY_PROGRAMS.map((tpl) => tpl.goal)).size).toBe(3);
    expect(new Set(READY_PROGRAMS.map((tpl) => tpl.id)).size).toBe(3);
  });

  it('every template has 7 days with sane exercise refs', () => {
    for (const tpl of READY_PROGRAMS) {
      expect(tpl.days).toHaveLength(7);
      for (const day of tpl.days) {
        expect(day.exercises.length).toBeGreaterThanOrEqual(3);
        expect(day.focusMuscles.length).toBeGreaterThan(0);
        expect(day.focusName.trim().length).toBeGreaterThan(0);
        for (const ref of day.exercises) {
          expect(ref.totalSets).toBeGreaterThan(0);
          expect(ref.workingReps).toBeGreaterThan(0);
          expect(ref.restSeconds).toBeGreaterThanOrEqual(15);
          expect((ref.refId == null) !== (ref.libRef == null)).toBe(true);
        }
      }
    }
  });

  it('resolves every ref into catalog exercises for all templates and levels', () => {
    const nativeIds = new Set(
      [...CATALOGS.gym, ...CATALOGS.home].flatMap((day) => day.exercises.map((ex) => ex.id))
    );
    const libIds = new Set(IMPORTED_EXERCISE_LIBRARY.map((ex) => ex.id));

    for (const tpl of READY_PROGRAMS) {
      for (const level of LEVELS) {
        const days = readyProgramDays(tpl.id, level);
        expect(days).toHaveLength(7);
        for (let i = 0; i < days.length; i += 1) {
          expect(days[i].id).toBe(`tpl-${tpl.id}-${i + 1}`);
          expect(days[i].exercises).toHaveLength(tpl.days[i].exercises.length);
          const ids = days[i].exercises.map((ex) => ex.id);
          expect(new Set(ids).size).toBe(ids.length);
          for (const ex of days[i].exercises) {
            expect(ex.name.trim().length).toBeGreaterThan(0);
            expect(ex.totalSets).toBeGreaterThan(0);
            expect(ex.workingReps).toBeGreaterThan(0);
            expect(ex.restSeconds).toBeGreaterThan(0);
            expect(ex.targetMuscles.length).toBeGreaterThan(0);
          }
        }
      }
      for (const day of tpl.days) {
        for (const ref of day.exercises) {
          if (ref.refId != null) expect(nativeIds.has(ref.refId)).toBe(true);
          if (ref.libRef != null) expect(libIds.has(ref.libRef)).toBe(true);
        }
      }
    }
  });

  it('applyProgramLevel adjusts sets and rest by level', () => {
    const ref = { refId: 10, totalSets: 3, workingReps: 10, restSeconds: 60 };
    expect(applyProgramLevel(ref, 'intermediate')).toEqual(ref);
    expect(applyProgramLevel(ref, 'beginner')).toEqual({ ...ref, totalSets: 2, restSeconds: 75 });
    expect(applyProgramLevel(ref, 'expert')).toEqual({ ...ref, totalSets: 4, restSeconds: 45 });
  });

  it('clamps level adjustments to sane minimums', () => {
    const one = { refId: 10, totalSets: 1, workingReps: 5, restSeconds: 20 };
    expect(applyProgramLevel(one, 'beginner').totalSets).toBe(1);
    const short = { refId: 10, totalSets: 2, workingReps: 5, restSeconds: 15 };
    expect(applyProgramLevel(short, 'expert').restSeconds).toBe(15);
  });

  it('guards template and level ids defensively', () => {
    expect(isProgramTemplateId('strength-home')).toBe(true);
    expect(isProgramTemplateId('nope')).toBe(false);
    expect(isProgramTemplateId(42)).toBe(false);
    expect(isReadyProgramLevel('expert')).toBe(true);
    expect(isReadyProgramLevel('pro')).toBe(false);
    expect(isReadyProgramLevel(null)).toBe(false);
  });

  it('templateById returns the matching template', () => {
    for (const tpl of READY_PROGRAMS) {
      expect(templateById(tpl.id).goal).toBe(tpl.goal);
    }
  });

  it('beginner level lowers volume and expert raises it', () => {
    const base = readyProgramDays('strength-home', 'intermediate')[0].exercises;
    const beginner = readyProgramDays('strength-home', 'beginner')[0].exercises;
    const expert = readyProgramDays('strength-home', 'expert')[0].exercises;
    expect(beginner[0].totalSets).toBe(base[0].totalSets - 1);
    expect(beginner[0].restSeconds).toBe(base[0].restSeconds + 15);
    expect(expert[0].totalSets).toBe(base[0].totalSets + 1);
    expect(expert[0].restSeconds).toBe(base[0].restSeconds - 15);
  });
});
