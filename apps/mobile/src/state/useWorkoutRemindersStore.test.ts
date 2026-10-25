import {
  DEFAULT_REMINDER_DAYS,
  DEFAULT_REMINDER_TIME,
  normalizeReminderDays,
  normalizeReminderTime,
  parseReminderTime,
  useWorkoutRemindersStore
} from './useWorkoutRemindersStore';

describe('useWorkoutRemindersStore (напоминания о тренировке)', () => {
  beforeEach(() => {
    useWorkoutRemindersStore.setState({
      enabled: false,
      days: [...DEFAULT_REMINDER_DAYS],
      time: DEFAULT_REMINDER_TIME
    });
  });

  test('normalizeReminderDays: мусор → дефолт; в массиве фильтрует, дедупит, сортирует', () => {
    expect(normalizeReminderDays('junk')).toEqual(DEFAULT_REMINDER_DAYS);
    expect(normalizeReminderDays(null)).toEqual(DEFAULT_REMINDER_DAYS);
    expect(normalizeReminderDays([3, 1, 1, 99, -1, 2.6])).toEqual([1, 3]);
    expect(normalizeReminderDays([6, 0])).toEqual([0, 6]);
    // пустой массив — осознанный выбор пользователя, оставляем пустым
    expect(normalizeReminderDays([])).toEqual([]);
  });

  test('normalizeReminderTime: формат, паддинг и клампы', () => {
    expect(normalizeReminderTime('9:5')).toBe('09:05');
    expect(normalizeReminderTime(' 23:59 ')).toBe('23:59');
    expect(normalizeReminderTime('24:00')).toBe(DEFAULT_REMINDER_TIME);
    expect(normalizeReminderTime('12:60')).toBe(DEFAULT_REMINDER_TIME);
    expect(normalizeReminderTime('junk')).toBe(DEFAULT_REMINDER_TIME);
    expect(normalizeReminderTime(42)).toBe(DEFAULT_REMINDER_TIME);
  });

  test('parseReminderTime: части времени', () => {
    expect(parseReminderTime('07:45')).toEqual({ hh: 7, mm: 45 });
    expect(parseReminderTime('bad')).toEqual(parseReminderTime(DEFAULT_REMINDER_TIME));
  });

  test('actions нормализуют вход', () => {
    useWorkoutRemindersStore.getState().setReminderDays([5, 5, 99]);
    expect(useWorkoutRemindersStore.getState().days).toEqual([5]);
    useWorkoutRemindersStore.getState().setReminderTime('25:99');
    expect(useWorkoutRemindersStore.getState().time).toBe(DEFAULT_REMINDER_TIME);
    useWorkoutRemindersStore.getState().setRemindersEnabled(true);
    expect(useWorkoutRemindersStore.getState().enabled).toBe(true);
  });

  test('дефолтное состояние: выключено, Пн/Ср/Пт, 18:30', () => {
    const s = useWorkoutRemindersStore.getState();
    expect(s.enabled).toBe(false);
    expect(s.days).toEqual([0, 2, 4]);
    expect(s.time).toBe('18:30');
  });
});
