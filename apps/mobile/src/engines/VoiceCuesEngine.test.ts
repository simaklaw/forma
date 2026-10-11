import * as Speech from 'expo-speech';
import { VoiceCuesEngine } from './VoiceCuesEngine';

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
});
