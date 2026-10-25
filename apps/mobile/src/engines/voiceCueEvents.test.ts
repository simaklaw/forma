import {
  DEFAULT_VOICE_CUE_FLAGS,
  VOICE_CUE_EVENTS,
  normalizeVoiceCueFlags
} from './voiceCueEvents';

describe('voiceCueEvents (гранулярные настройки озвучки)', () => {
  test('дефолт — включены все события (поведение до настроек)', () => {
    expect(DEFAULT_VOICE_CUE_FLAGS).toEqual({
      exerciseStart: true,
      setComplete: true,
      restCountdown: true,
      restOver: true,
      dayComplete: true
    });
  });

  test('ровно пять озвучиваемых событий без дублей', () => {
    expect(VOICE_CUE_EVENTS).toHaveLength(5);
    expect(new Set(VOICE_CUE_EVENTS).size).toBe(5);
  });

  test('сохранённые флаги читаются, пропущенные берутся из дефолтов', () => {
    const flags = normalizeVoiceCueFlags({ restCountdown: false, restOver: true });
    expect(flags.restCountdown).toBe(false);
    expect(flags.restOver).toBe(true);
    expect(flags.exerciseStart).toBe(true);
    expect(flags.setComplete).toBe(true);
    expect(flags.dayComplete).toBe(true);
  });

  test('не-boolean значения и незнакомые ключи отбрасываются', () => {
    const flags = normalizeVoiceCueFlags({
      exerciseStart: 'yes',
      setComplete: 0,
      junk: true,
      dayComplete: false
    });
    expect(flags.exerciseStart).toBe(true);
    expect(flags.setComplete).toBe(true);
    expect(flags.dayComplete).toBe(false);
    expect(Object.keys(flags).sort()).toEqual([...VOICE_CUE_EVENTS].sort());
  });

  test('null/undefined от старых снапшотов дают дефолты', () => {
    expect(normalizeVoiceCueFlags(null)).toEqual(DEFAULT_VOICE_CUE_FLAGS);
    expect(normalizeVoiceCueFlags(undefined)).toEqual(DEFAULT_VOICE_CUE_FLAGS);
  });
});
