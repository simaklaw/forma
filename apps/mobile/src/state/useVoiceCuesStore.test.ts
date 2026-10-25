import { useVoiceCuesStore } from './useVoiceCuesStore';
import { DEFAULT_VOICE_CUE_FLAGS } from '@/engines/voiceCueEvents';

describe('useVoiceCuesStore (гранулярные настройки озвучки)', () => {
  beforeEach(() => {
    useVoiceCuesStore.setState({
      enabled: false,
      events: { ...DEFAULT_VOICE_CUE_FLAGS }
    });
  });

  test('переключение одного события не трогает остальные', () => {
    useVoiceCuesStore.getState().setEventEnabled('restCountdown', false);
    const { events } = useVoiceCuesStore.getState();
    expect(events.restCountdown).toBe(false);
    expect(events.restOver).toBe(true);
    expect(events.exerciseStart).toBe(true);
  });

  test('мастер-тумблер независим от событий', () => {
    useVoiceCuesStore.getState().setEnabled(true);
    const s = useVoiceCuesStore.getState();
    expect(s.enabled).toBe(true);
    expect(s.events).toEqual(DEFAULT_VOICE_CUE_FLAGS);
  });
});
