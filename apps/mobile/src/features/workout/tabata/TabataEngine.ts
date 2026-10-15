/**
 * Wall-clock Tabata/HIIT interval engine (OpenHIIT-inspired, MIT concepts).
 * Survives background throttling by recomputing remaining from Date.now().
 */
import { AppState, type NativeEventSubscription } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { TabataConfig, TabataPhase, TabataSnapshot } from './tabataTypes';

export type { TabataSnapshot };

type Listener = (snap: TabataSnapshot) => void;

export class TabataEngine {
  private config: TabataConfig;
  private phase: TabataPhase = 'idle';
  private round = 0;
  private phaseEndsAt = 0;
  private running = false;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private appSub: NativeEventSubscription | null = null;
  private listeners = new Set<Listener>();

  constructor(config: TabataConfig) {
    this.config = { ...config };
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.snapshot());
    return () => this.listeners.delete(fn);
  }

  getConfig(): TabataConfig {
    return { ...this.config };
  }

  setConfig(config: TabataConfig) {
    if (this.running) return;
    this.config = { ...config };
    this.phase = 'idle';
    this.round = 0;
    this.emit();
  }

  snapshot(): TabataSnapshot {
    return {
      phase: this.phase,
      round: this.round,
      remainingSec: this.remainingNow(),
      running: this.running
    };
  }

  start() {
    if (this.running) return;
    if (this.phase === 'idle' || this.phase === 'done') {
      this.enterPhase('prepare', this.config.prepareSec);
      this.round = 0;
    } else {
      const left = Math.max(1, this.remainingNow());
      this.phaseEndsAt = Date.now() + left * 1000;
    }
    this.running = true;
    this.ensureTicker();
    this.emit();
  }

  pause() {
    if (!this.running) return;
    const left = this.remainingNow();
    this.running = false;
    this.clearTicker();
    this.phaseEndsAt = Date.now() + left * 1000;
    this.emit();
  }

  reset() {
    this.running = false;
    this.clearTicker();
    this.phase = 'idle';
    this.round = 0;
    this.phaseEndsAt = 0;
    this.emit();
  }

  private remainingNow(): number {
    if (this.phase === 'idle' || this.phase === 'done') return 0;
    if (!this.phaseEndsAt) return 0;
    return Math.max(0, Math.ceil((this.phaseEndsAt - Date.now()) / 1000));
  }

  private enterPhase(phase: TabataPhase, seconds: number) {
    this.phase = phase;
    this.phaseEndsAt = Date.now() + Math.max(0, seconds) * 1000;
    if (phase === 'work' || phase === 'rest') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    } else if (phase === 'done') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  }

  private advance() {
    const c = this.config;
    if (this.phase === 'prepare') {
      this.round = 1;
      this.enterPhase('work', c.workSec);
      return;
    }
    if (this.phase === 'work') {
      if (this.round >= c.rounds) {
        this.enterPhase('done', 0);
        this.running = false;
        this.clearTicker();
        return;
      }
      this.enterPhase('rest', c.restSec);
      return;
    }
    if (this.phase === 'rest') {
      this.round += 1;
      this.enterPhase('work', c.workSec);
    }
  }

  private tick() {
    if (!this.running) return;
    const left = this.remainingNow();
    if (left <= 0 && this.phase !== 'done' && this.phase !== 'idle') {
      this.advance();
    }
    this.emit();
  }

  private ensureTicker() {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => this.tick(), 250);
    this.appSub = AppState.addEventListener('change', (s) => {
      if (s === 'active') this.tick();
    });
  }

  private clearTicker() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.appSub?.remove();
    this.appSub = null;
  }

  private emit() {
    const snap = this.snapshot();
    for (const fn of this.listeners) fn(snap);
  }
}
