/**
 * VoiceCuesEngine — thin wrapper around expo-speech, mirrors the
 * haptic/beep side-effect pattern already in RestTimerEngine.ts.
 * No-ops entirely when disabled; never throws into the caller.
 */
import * as Speech from 'expo-speech';

const VOICE_OPTIONS = {
  language: 'ru-RU',
  pitch: 1.0,
  rate: 1.0
};

export class VoiceCuesEngine {
  private static enabled = false;
  private static speechRequest = 0;

  static setEnabled(value: boolean) {
    this.enabled = value;
    if (!value) {
      this.speechRequest += 1;
      void Speech.stop().catch(() => {});
    }
  }

  private static speak(text: string) {
    if (!this.enabled) return;
    const request = ++this.speechRequest;
    try {
      // stop() is async: wait until queued speech is cleared before starting the new cue.
      void Speech.stop()
        .then(() => {
          if (!this.enabled || request !== this.speechRequest) return;
          Speech.speak(text, VOICE_OPTIONS);
        })
        .catch((e) => console.warn('VoiceCuesEngine: speak failed', e));
    } catch (e) {
      console.warn('VoiceCuesEngine: speak failed', e);
    }
  }

  static announceExercise(name: string) {
    this.speak(name);
  }

  static announceSetComplete(setNumber: number, totalSets: number) {
    if (setNumber >= totalSets) {
      this.speak('Упражнение выполнено');
    } else {
      this.speak(`Подход ${setNumber} из ${totalSets}`);
    }
  }

  static announceRestCountdown(secondsLeft: number) {
    if (secondsLeft === 10 || secondsLeft === 3 || secondsLeft === 2 || secondsLeft === 1) {
      this.speak(String(secondsLeft));
    }
  }

  static announceRestOver() {
    this.speak('Отдых закончен, продолжаем');
  }

  static announceDayComplete() {
    this.speak('Тренировка на сегодня завершена, отличная работа');
  }
}
