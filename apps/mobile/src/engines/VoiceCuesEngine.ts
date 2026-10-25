/**
 * VoiceCuesEngine — thin wrapper around expo-speech, mirrors the
 * haptic/beep side-effect pattern already in RestTimerEngine.ts.
 * No-ops entirely when disabled; never throws into the caller.
 *
 * Гранулярные настройки (voiceCueEvents.ts): каждый announce-метод слушает
 * свой флаг — можно озвучивать, например, только отдых и подходы.
 */
import * as Speech from 'expo-speech';
import { DEFAULT_VOICE_CUE_FLAGS, type VoiceCueEvent } from './voiceCueEvents';

const VOICE_OPTIONS = {
  language: 'ru-RU',
  pitch: 1.0,
  rate: 1.0
};

export class VoiceCuesEngine {
  private static enabled = false;
  private static speechRequest = 0;
  private static cueFlags: Record<VoiceCueEvent, boolean> = { ...DEFAULT_VOICE_CUE_FLAGS };

  static setEnabled(value: boolean) {
    this.enabled = value;
    if (!value) {
      this.speechRequest += 1;
      void Speech.stop().catch(() => {});
    }
  }

  /** Гранулярные настройки: какие события озвучивать (мастер-тумблер — setEnabled). */
  static configure(flags: Record<VoiceCueEvent, boolean>) {
    this.cueFlags = { ...flags };
  }

  private static speak(event: VoiceCueEvent, text: string) {
    if (!this.enabled || !this.cueFlags[event]) return;
    const request = ++this.speechRequest;
    try {
      // stop() is async: wait until queued speech is cleared before starting the new cue.
      void Speech.stop()
        .then(() => {
          if (!this.enabled || !this.cueFlags[event] || request !== this.speechRequest) return;
          Speech.speak(text, VOICE_OPTIONS);
        })
        .catch((e) => console.warn('VoiceCuesEngine: speak failed', e));
    } catch (e) {
      console.warn('VoiceCuesEngine: speak failed', e);
    }
  }

  static announceExercise(name: string) {
    this.speak('exerciseStart', name);
  }

  static announceSetComplete(setNumber: number, totalSets: number) {
    if (setNumber >= totalSets) {
      this.speak('setComplete', 'Упражнение выполнено');
    } else {
      this.speak('setComplete', `Подход ${setNumber} из ${totalSets}`);
    }
  }

  static announceRestCountdown(secondsLeft: number) {
    if (secondsLeft === 10 || secondsLeft === 3 || secondsLeft === 2 || secondsLeft === 1) {
      this.speak('restCountdown', String(secondsLeft));
    }
  }

  static announceRestOver() {
    this.speak('restOver', 'Отдых закончен, продолжаем');
  }

  static announceDayComplete() {
    this.speak('dayComplete', 'Тренировка на сегодня завершена, отличная работа');
  }
}
