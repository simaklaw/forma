import { useThemeStore } from './useThemeStore';

describe('useThemeStore (issue #160: light/dark/system)', () => {
  beforeEach(() => {
    useThemeStore.setState({ preference: 'dark', systemMode: 'light', mode: 'dark' });
  });

  test('прямое предпочтение задаёт эффективный режим', () => {
    useThemeStore.getState().setPreference('light');
    const s = useThemeStore.getState();
    expect(s.preference).toBe('light');
    expect(s.mode).toBe('light');
  });

  test('режим system следует за системной схемой', () => {
    useThemeStore.getState().setPreference('system');
    expect(useThemeStore.getState().mode).toBe('light'); // systemMode по умолчанию light

    useThemeStore.getState().setSystemMode('dark');
    const s = useThemeStore.getState();
    expect(s.preference).toBe('system');
    expect(s.mode).toBe('dark');

    useThemeStore.getState().setSystemMode('light');
    expect(useThemeStore.getState().mode).toBe('light');
  });

  test('смена системной схемы не влияет на жёстко заданную тему', () => {
    useThemeStore.getState().setPreference('dark');
    useThemeStore.getState().setSystemMode('light');
    expect(useThemeStore.getState().mode).toBe('dark');
  });

  test('легаси setMode пинует предпочтение (обратная совместимость)', () => {
    useThemeStore.getState().setPreference('system');
    useThemeStore.getState().setSystemMode('dark');
    useThemeStore.getState().setMode('light');
    const s = useThemeStore.getState();
    expect(s.preference).toBe('light');
    expect(s.mode).toBe('light');
    // системные обновления больше не влияют
    useThemeStore.getState().setSystemMode('dark');
    expect(useThemeStore.getState().mode).toBe('light');
  });

  test('toggleMode переключает и пинует предпочтение', () => {
    useThemeStore.getState().setPreference('system');
    // systemMode по умолчанию light => эффективный режим light, toggle уходит в dark
    useThemeStore.getState().toggleMode();
    const s = useThemeStore.getState();
    expect(s.preference).toBe('dark');
    expect(s.mode).toBe('dark');
    // системные обновления больше не влияют: предпочтение запиновано
    useThemeStore.getState().setSystemMode('light');
    expect(useThemeStore.getState().mode).toBe('dark');
  });
});
