import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CoachEngine, estimateBurnFromSetLogs, toDateKey } from '@forma/core';
import { colors, fonts, spacing } from '@/core/theme/tokens';
import { mobileCoachSnapshot } from '@/lib/coachSnapshot';
import { useFitPulseStore } from '@/state/useFitPulseStore';

type Props = {
  dayName: string;
  anyDoneToday: boolean;
  /** Optional map exerciseId → display name for MET lookup. */
  exerciseNames?: Record<number, string>;
};

/** On-device coach strip — RulesLocalAITrainer until llama.rn is wired. */
export function WorkoutCoachCard({ dayName, anyDoneToday, exerciseNames }: Props) {
  const profile = useFitPulseStore((s) => s.profile);
  const todayMeals = useFitPulseStore((s) => s.todayMeals);
  const setLogs = useFitPulseStore((s) => s.setLogs);
  const targets = useFitPulseStore((s) => s.calculateTargets());
  const [advice, setAdvice] = useState('');

  const burned = useMemo(
    () =>
      estimateBurnFromSetLogs({
        weightKg: profile.weight,
        setLogs,
        dateKey: toDateKey(new Date()),
        exerciseNames
      }),
    [profile.weight, setLogs, exerciseNames]
  );

  const snapshot = useMemo(
    () =>
      mobileCoachSnapshot({
        profile,
        todayMeals,
        targetCalories: targets.target,
        burnedCalories: burned,
        lastWorkoutName: anyDoneToday ? dayName : undefined,
        rpeScore: 7
      }),
    [profile, todayMeals, targets.target, burned, dayName, anyDoneToday]
  );

  useEffect(() => {
    let cancelled = false;
    const prompt = anyDoneToday ? 'восстановление после тренировки' : 'совет на тренировку';
    CoachEngine.getTrainer()
      .generateAdvice(snapshot, prompt)
      .then((text) => {
        if (!cancelled) setAdvice(text);
      });
    return () => {
      cancelled = true;
    };
  }, [snapshot, anyDoneToday]);

  if (!advice) return null;

  return (
    <View style={styles.card} accessibilityRole="text">
      <Text style={styles.label}>
        Тренер · on-device{burned > 0 ? ` · ~${burned} ккал` : ''}
      </Text>
      <Text style={styles.body}>{advice}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.xxl,
    marginBottom: spacing.md,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.panel
  },
  label: {
    color: colors.lime,
    fontSize: 11,
    fontFamily: fonts.bodySemi,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.6
  },
  body: {
    color: colors.paperDim,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: fonts.body
  }
});
