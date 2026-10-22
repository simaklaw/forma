import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { fonts, radius, spacing, type ColorTokens } from '@/core/theme/tokens';
import { useThemeColors } from '@/core/theme/useThemeColors';
import { useT } from '@/i18n/strings';

interface Props {
  initialSeconds: number;
  active?: boolean;
  disabled?: boolean;
}

const MIN_SECONDS = 5;
const MAX_SECONDS = 600;
const STEP_SECONDS = 15;

function safeSeconds(value: number): number {
  return Math.max(MIN_SECONDS, Math.min(MAX_SECONDS, Math.round(value)));
}

function clock(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safe / 60);
  const remainder = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

/** Standalone interval timer: expiry never silently logs a workout set. */
export default function ExerciseTimer({
  initialSeconds,
  active = true,
  disabled = false
}: Props) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const t = useT();
  const initial = safeSeconds(initialSeconds);
  const [duration, setDuration] = useState(initial);
  const [remaining, setRemaining] = useState(initial);
  const [running, setRunning] = useState(false);
  const [endAt, setEndAt] = useState<number | null>(null);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!running) return;
    if (!active || disabled) {
      const left = endAt == null ? remaining : Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      setRemaining(left);
      setRunning(false);
      setEndAt(null);
      return;
    }
    if (endAt == null) return;

    const tick = () => {
      const next = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      setRemaining(next);
      if (next === 0) {
        setRunning(false);
        setEndAt(null);
        setExpired(true);
      }
    };
    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [active, disabled, running, endAt]);

  function startOrResume() {
    if (disabled || !active) return;
    const seconds = remaining > 0 ? remaining : duration;
    setRemaining(seconds);
    setExpired(false);
    setEndAt(Date.now() + seconds * 1000);
    setRunning(true);
  }

  function pause() {
    const left = endAt == null ? remaining : Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
    setRemaining(left);
    setRunning(false);
    setEndAt(null);
  }

  function reset() {
    setRunning(false);
    setEndAt(null);
    setRemaining(duration);
    setExpired(false);
  }

  function adjust(delta: number) {
    if (disabled || running) return;
    const next = safeSeconds(duration + delta);
    setDuration(next);
    setRemaining(next);
    setExpired(false);
  }

  return (
    <View style={[styles.root, disabled && styles.disabled]} accessibilityLabel={t('sheetExerciseTimerTitle')}>
      <View style={styles.headingRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.eyebrow, { color: colors.lime }]}>{t('sheetExerciseTimerTitle')}</Text>
          <Text style={[styles.hint, { color: colors.paperFaint }]}>{t('sheetExerciseTimerHint')}</Text>
        </View>
        <View style={[styles.timeBadge, { backgroundColor: colors.limeDim, borderColor: colors.lineStrong }]}>
          <Text style={[styles.time, { color: colors.paper }]}>{clock(remaining)}</Text>
        </View>
      </View>

      <View style={styles.adjustRow}>
        <TouchableOpacity
          style={[styles.adjustButton, { borderColor: colors.lineStrong }]}
          onPress={() => adjust(-STEP_SECONDS)}
          disabled={disabled || running || duration <= MIN_SECONDS}
          accessibilityRole="button"
          accessibilityLabel={t('sheetTimerAdjustDown')}
        >
          <Text style={[styles.adjustText, { color: colors.paperDim }]}>−15 с</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.adjustButton, { borderColor: colors.lineStrong }]}
          onPress={() => adjust(STEP_SECONDS)}
          disabled={disabled || running || duration >= MAX_SECONDS}
          accessibilityRole="button"
          accessibilityLabel={t('sheetTimerAdjustUp')}
        >
          <Text style={[styles.adjustText, { color: colors.paperDim }]}>+15 с</Text>
        </TouchableOpacity>
      </View>

      {expired && <Text style={[styles.done, { color: colors.lime }]} accessibilityLiveRegion="polite">{t('sheetTimerDone')}</Text>}

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: colors.lime }]}
          onPress={running ? pause : startOrResume}
          disabled={disabled || !active}
          accessibilityRole="button"
          accessibilityLabel={running ? t('sheetTimerPause') : remaining !== duration && remaining > 0 ? t('sheetTimerResume') : t('sheetTimerStart')}
        >
          <Text style={[styles.primaryText, { color: colors.ink }]}>
            {running ? t('sheetTimerPause') : remaining !== duration && remaining > 0 ? t('sheetTimerResume') : t('sheetTimerStart')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.resetButton, { borderColor: colors.lineStrong }]}
          onPress={reset}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={t('sheetTimerReset')}
        >
          <Text style={[styles.resetText, { color: colors.paperDim }]}>{t('sheetTimerReset')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    root: {
      marginTop: spacing.md,
      borderRadius: radius.card,
      borderWidth: 1,
      borderColor: colors.lineStrong,
      backgroundColor: colors.panel,
      padding: spacing.md,
      gap: spacing.sm
    },
    disabled: { opacity: 0.55 },
    headingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    eyebrow: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1.2, marginBottom: 5 },
    hint: { fontFamily: fonts.body, fontSize: 11, lineHeight: 15 },
    timeBadge: {
      minWidth: 104,
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: radius.control,
      paddingHorizontal: spacing.sm,
      paddingVertical: 7
    },
    time: { fontFamily: fonts.mono, fontSize: 28, fontVariant: ['tabular-nums'] },
    adjustRow: { flexDirection: 'row', gap: spacing.sm },
    adjustButton: {
      borderWidth: 1,
      borderRadius: radius.pill,
      paddingHorizontal: 14,
      paddingVertical: 7,
      minHeight: 36,
      justifyContent: 'center'
    },
    adjustText: { fontFamily: fonts.bodySemi, fontSize: 12 },
    done: { fontFamily: fonts.bodySemi, fontSize: 12 },
    actions: { flexDirection: 'row', gap: spacing.sm },
    primaryButton: {
      flex: 1,
      minHeight: 44,
      borderRadius: radius.control,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacing.md
    },
    primaryText: { fontFamily: fonts.bodySemi, fontSize: 14 },
    resetButton: {
      minHeight: 44,
      minWidth: 100,
      borderRadius: radius.control,
      borderWidth: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacing.md
    },
    resetText: { fontFamily: fonts.bodySemi, fontSize: 13 }
  });
}
