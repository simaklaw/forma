/**
 * RestTimerEngine.ts
 *
 * Countdown + haptic feedback between sets. This is a genuine capability
 * upgrade over the HTML prototype: the web version could only reach for
 * navigator.vibrate() (works on some Android browsers, silently no-ops on
 * iOS Safari/desktop). expo-haptics gives real Impact Light/Heavy and
 * Success notification patterns on both platforms, matching the report's
 * spec exactly (Impact Light on tab switch, Impact Heavy on set completion,
 * three-pulse Success on finishing the day's plan).
 *
 * The audible beep from the HTML version (raw Web Audio oscillator) has no
 * direct native equivalent without either bundling a short audio asset or
 * using a lower-level native audio module — Web Audio's oscillator API
 * doesn't exist in React Native. playBeep() plays assets/sfx/beep.wav,
 * passed in by the caller (see ExerciseSheet.tsx); it silently no-ops if no
 * source is given, so the timer still works without sound.
 *
 * Обновление: startTimer() used to decrement a plain `remaining -= 1` inside
 * setInterval. That's wrong the moment the phone is locked mid-rest — the
 * single most common way people actually rest between sets. iOS (and to a
 * lesser extent Android) throttles or fully suspends JS timers in the
 * background, so the countdown either freezes or, worse, silently races
 * ahead/behind real elapsed time once the interval resumes — the "rest is
 * over" beep/haptic then fires at the wrong moment. Fixed by tracking wall
 * clock (`startedAt` + `durationMs`) instead of a decrementing counter:
 * `remaining` is always recomputed from `Date.now() - startedAt`, so it's
 * correct regardless of how many ticks were actually delivered, and an
 * AppState listener forces an immediate resync the moment the app returns
 * to the foreground rather than waiting for the next 1s tick.
 */

import { AppState, AppStateStatus, NativeEventSubscription } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Audio, AVPlaybackSource } from 'expo-av';

export type TimerTickHandler = (remainingSeconds: number) => void;
export type TimerCompleteHandler = () => void;

export class RestTimerEngine {
  private static intervalId: ReturnType<typeof setInterval> | null = null;
  private static appStateSub: NativeEventSubscription | null = null;
  private static sound: Audio.Sound | null = null;

  private static startedAt = 0;
  private static durationMs = 0;
  private static onTick: TimerTickHandler | null = null;
  private static onComplete: TimerCompleteHandler | null = null;
  private static beepSource: AVPlaybackSource | undefined;
  private static lastEmitted = -1;

  static async playBeep(source?: AVPlaybackSource) {
    try {
      if (!source) return;
      if (this.sound) {
        await this.sound.unloadAsync();
      }
      const { sound } = await Audio.Sound.createAsync(source);
      this.sound = sound;
      await sound.playAsync();
    } catch (e) {
      console.warn('RestTimerEngine: beep playback failed', e);
    }
  }

  static hapticSetComplete() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
  }

  static hapticTabSwitch() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }

  static hapticDayComplete() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }

  static startTimer(seconds: number, onTick: TimerTickHandler, onComplete: TimerCompleteHandler, beepSource?: AVPlaybackSource) {
    this.stopTimer();

    this.startedAt = Date.now();
    this.durationMs = seconds * 1000;
    this.onTick = onTick;
    this.onComplete = onComplete;
    this.beepSource = beepSource;
    this.lastEmitted = -1;

    this.tick(); // emit the initial "seconds" value immediately, same as before

    this.intervalId = setInterval(() => this.tick(), 1000);
    // Background JS timers get throttled/paused — this resyncs against wall
    // clock the instant the app comes back, instead of waiting for setInterval
    // to catch up (which it may never fully do after a long background spell).
    this.appStateSub = AppState.addEventListener('change', this.handleAppStateChange);
  }

  private static handleAppStateChange = (state: AppStateStatus) => {
    if (state === 'active' && this.onTick) {
      this.tick();
    }
  };

  private static tick() {
    if (!this.onTick || !this.onComplete) return;

    const elapsedMs = Date.now() - this.startedAt;
    const remaining = Math.max(0, Math.ceil((this.durationMs - elapsedMs) / 1000));

    if (remaining <= 0) {
      const onComplete = this.onComplete;
      const beepSource = this.beepSource;
      this.stopTimer();
      this.playBeep(beepSource);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onComplete();
      return;
    }

    if (remaining !== this.lastEmitted) {
      if (remaining <= 3) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }
      this.lastEmitted = remaining;
      this.onTick(remaining);
    }
  }

  static stopTimer() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.appStateSub) {
      this.appStateSub.remove();
      this.appStateSub = null;
    }
    this.onTick = null;
    this.onComplete = null;
  }
}
