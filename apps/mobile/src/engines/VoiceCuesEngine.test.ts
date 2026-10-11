import * as Speech from 'expo-speech';
import { VoiceCuesEngine } from './VoiceCuesEngine';

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

  it('calls Speech.speak when enabled', () => {
    VoiceCuesEngine.setEnabled(true);
    VoiceCuesEngine.announceExercise('Отжимания');
    expect(Speech.speak).toHaveBeenCalledWith('Отжимания', expect.any(Object));
  });

  it('only announces countdown at 10/3/2/1 seconds, not every second', () => {
    VoiceCuesEngine.setEnabled(true);
    VoiceCuesEngine.announceRestCountdown(25);
    expect(Speech.speak).not.toHaveBeenCalled();
    VoiceCuesEngine.announceRestCountdown(3);
    expect(Speech.speak).toHaveBeenCalledTimes(1);
  });

  it('announces final-set completion differently from mid-set', () => {
    VoiceCuesEngine.setEnabled(true);
    VoiceCuesEngine.announceSetComplete(2, 4);
    expect(Speech.speak).toHaveBeenCalledWith('Подход 2 из 4', expect.any(Object));
    VoiceCuesEngine.announceSetComplete(4, 4);
    expect(Speech.speak).toHaveBeenCalledWith('Упражнение выполнено', expect.any(Object));
  });

  it('stops any in-progress speech when disabled', () => {
    VoiceCuesEngine.setEnabled(true);
    VoiceCuesEngine.setEnabled(false);
    expect(Speech.stop).toHaveBeenCalled();
  });
});
