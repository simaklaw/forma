import { useCustomWorkoutStore } from './useCustomWorkoutStore';

const ID_RE = /^cw-[a-z0-9]{6,32}$/;

describe('useCustomWorkoutStore (свои тренировки)', () => {
  beforeEach(() => {
    useCustomWorkoutStore.setState({ workouts: [] });
  });

  test('createWorkout добавляет пустую тренировку с валидным id', () => {
    const id = useCustomWorkoutStore.getState().createWorkout('  Утро,  кор ');
    expect(id).toMatch(ID_RE);
    const w = useCustomWorkoutStore.getState().workouts;
    expect(w).toHaveLength(1);
    expect(w[0]).toMatchObject({ id, name: 'Утро, кор', items: [] });
  });

  test('renameWorkout тримит имя и не трогает чужие id', () => {
    const id = useCustomWorkoutStore.getState().createWorkout('A');
    useCustomWorkoutStore.getState().createWorkout('B');
    useCustomWorkoutStore.getState().renameWorkout(id, '  Новое имя  ');
    const w = useCustomWorkoutStore.getState().workouts;
    expect(w.find((x) => x.id === id)?.name).toBe('Новое имя');
    expect(w.find((x) => x.name === 'B')).toBeDefined();
  });

  test('renameWorkout с пустым именем оставляет прежнее', () => {
    const id = useCustomWorkoutStore.getState().createWorkout('Старое');
    useCustomWorkoutStore.getState().renameWorkout(id, '   ');
    expect(useCustomWorkoutStore.getState().workouts[0]?.name).toBe('Старое');
  });

  test('setWorkoutItems нормализует элементы (мусор отбрасывается)', () => {
    const id = useCustomWorkoutStore.getState().createWorkout('A');
    useCustomWorkoutStore.getState().setWorkoutItems(id, [
      { exerciseId: 15, sets: 3, reps: 40, restSeconds: 45 },
      'junk',
      { exerciseId: -1 }
    ]);
    expect(useCustomWorkoutStore.getState().workouts[0]?.items).toEqual([
      { exerciseId: 15, sets: 3, reps: 40, restSeconds: 45, weightKg: undefined }
    ]);
  });

  test('setWorkoutItems для неизвестного id — no-op', () => {
    useCustomWorkoutStore.getState().createWorkout('A');
    const before = useCustomWorkoutStore.getState().workouts;
    useCustomWorkoutStore.getState().setWorkoutItems('cw-nope12345', [
      { exerciseId: 1, sets: 1, reps: 1, restSeconds: 15 }
    ]);
    expect(useCustomWorkoutStore.getState().workouts).toBe(before);
  });

  test('duplicateWorkout копирует элементы и возвращает новый id', () => {
    const id = useCustomWorkoutStore.getState().createWorkout('A');
    useCustomWorkoutStore.getState().setWorkoutItems(id, [
      { exerciseId: 15, sets: 3, reps: 40, restSeconds: 45 }
    ]);
    const copyId = useCustomWorkoutStore.getState().duplicateWorkout(id, 'A (копия)');
    expect(copyId).not.toBeNull();
    expect(copyId).toMatch(ID_RE);
    const w = useCustomWorkoutStore.getState().workouts;
    expect(w).toHaveLength(2);
    const copy = w.find((x) => x.id === copyId);
    expect(copy?.name).toBe('A (копия)');
    expect(copy?.items).toEqual([{ exerciseId: 15, sets: 3, reps: 40, restSeconds: 45, weightKg: undefined }]);
  });

  test('deleteWorkout удаляет только целевую', () => {
    const a = useCustomWorkoutStore.getState().createWorkout('A');
    useCustomWorkoutStore.getState().createWorkout('B');
    useCustomWorkoutStore.getState().deleteWorkout(a);
    const w = useCustomWorkoutStore.getState().workouts;
    expect(w).toHaveLength(1);
    expect(w[0]?.name).toBe('B');
  });
});
