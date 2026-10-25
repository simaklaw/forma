import * as Speech from 'expo-speech';
import { VoiceCuesEngine } from './VoiceCuesEngine';
import { DEFAULT_VOICE_CUE_FLAGS } from './voiceCueEvents';

async function flushSpeech(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  stop: jest.fn().mockResolvedValue(undefined)
}));

describe('VoiceCuesEngine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    VoiceCuesEngine.setEnabled(false);
    VoiceCuesEngine.configure(DEFAULT_VOICE_CUE_FLAGS);
  });

  it('does not call Speech.speak when disabled', () => {
    VoiceCuesEngine.announceExercise('Отжимания');
    expect(Speech.speak).not.toHaveBeenCalled();
  });

  it('waits for Speech.stop before speaking when enabled', async () => {
    VoiceCuesEngine.setEnabled(true);
    VoiceCuesEngine.announceExercise('Отжимания');
    expect(Speech.speak).not.toHaveBeenCalled();
    await flushSpeech();
    expect(Speech.speak).toHaveBeenCalledWith('Отжимания', expect.any(Object));
    const stopCalls = jest.mocked(Speech.stop).mock.invocationCallOrder;
    expect(stopCalls[stopCalls.length - 1]).toBeLessThan(
      jest.mocked(Speech.speak).mock.invocationCallOrder[0]
    );
  });

  it('only announces countdown at 10/3/2/1 seconds, not every second', async () => {
    VoiceCuesEngine.setEnabled(true);
    VoiceCuesEngine.announceRestCountdown(25);
    expect(Speech.speak).not.toHaveBeenCalled();
    VoiceCuesEngine.announceRestCountdown(3);
    await flushSpeech();
    expect(Speech.speak).toHaveBeenCalledTimes(1);
  });

  it('announces final-set completion differently from mid-set', async () => {
    VoiceCuesEngine.setEnabled(true);
    VoiceCuesEngine.announceSetComplete(2, 4);
    await flushSpeech();
    expect(Speech.speak).toHaveBeenCalledWith('Подход 2 из 4', expect.any(Object));
    VoiceCuesEngine.announceSetComplete(4, 4);
    await flushSpeech();
    expect(Speech.speak).toHaveBeenCalledWith('Упражнение выполнено', expect.any(Object));
  });

  it('stops any in-progress speech when disabled', () => {
    VoiceCuesEngine.setEnabled(true);
    VoiceCuesEngine.setEnabled(false);
    expect(Speech.stop).toHaveBeenCalled();
  });

  it('does not start a queued cue if voice is disabled before stop resolves', async () => {
    VoiceCuesEngine.setEnabled(true);
    VoiceCuesEngine.announceExercise('Отжимания');
    VoiceCuesEngine.setEnabled(false);
    await flushSpeech();
    expect(Speech.speak).not.toHaveBeenCalled();
  });

  it('mutes only the configured cue kinds (granular settings)', async () => {
    VoiceCuesEngine.setEnabled(true);
    VoiceCuesEngine.configure({
      ...DEFAULT_VOICE_CUE_FLAGS,
      exerciseStart: false,
      restCountdown: false
    });
    VoiceCuesEngine.announceExercise('Отжимания');
    VoiceCuesEngine.announceRestCountdown(3);
    await flushSpeech();
    expect(Speech.speak).not.toHaveBeenCalled();
    VoiceCuesEngine.announceSetComplete(2, 4);
    await flushSpeech();
    expect(Speech.speak).toHaveBeenCalledWith('Подход 2 из 4', expect.any(Object));
  });

  it('granular flags do not force speech while the master toggle is off', async () => {
    VoiceCuesEngine.setEnabled(false);
    VoiceCuesEngine.configure({ ...DEFAULT_VOICE_CUE_FLAGS, restOver: true });
    VoiceCuesEngine.announceRestOver();
    await flushSpeech();
    expect(Speech.speak).not.toHaveBeenCalled();
  });

  it('does not start a queued cue if its event was muted before stop resolves', async () => {
    VoiceCuesEngine.setEnabled(true);
    VoiceCuesEngine.announceExercise('Отжимания');
    VoiceCuesEngine.configure({ ...DEFAULT_VOICE_CUE_FLAGS, exerciseStart: false });
    await flushSpeech();
    expect(Speech.speak).not.toHaveBeenCalled();
  });
});
