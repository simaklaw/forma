import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CoachEngine, estimateBurnFromSetLogs, isProfileComplete, toDateKey } from '@forma/core';
import { colors, fonts, radius, spacing } from '@/core/theme/tokens';
import { mobileCoachSnapshot } from '@/lib/coachSnapshot';
import { useFitPulseStore } from '@/state/useFitPulseStore';

type Props = {
  dayName: string;
  anyDoneToday: boolean;
  exerciseNames?: Record<number, string>;
};

/** On-device coach strip — only when profile is complete (no domain throw). */
export function WorkoutCoachCard({ dayName, anyDoneToday, exerciseNames }: Props) {
  const profile = useFitPulseStore((s) => s.profile);
  const todayMeals = useFitPulseStore((s) => s.todayMeals);
  const setLogs = useFitPulseStore((s) => s.setLogs);
  const calculateTargets = useFitPulseStore((s) => s.calculateTargets);
  const [advice, setAdvice] = useState('');

  const complete = isProfileComplete({
    weightKg: profile.weight,
    heightCm: profile.height,
    age: profile.age,
    gender: profile.sex
  });

  const burned = useMemo(() => {
    if (!complete || !Number.isFinite(profile.weight) || (profile.weight as number) <= 0) return 0;
    return estimateBurnFromSetLogs({
      weightKg: profile.weight as number,
      setLogs,
      dateKey: toDateKey(new Date()),
      exerciseNames
    });
  }, [complete, profile.weight, setLogs, exerciseNames]);

  const snapshot = useMemo(() => {
    if (!complete) return null;
    const targets = calculateTargets();
    return mobileCoachSnapshot({
      profile: profile as {
        sex: 'male' | 'female';
        age: number;
        height: number;
        weight: number;
        pal: number;
        goal: 'recomp' | 'maintain' | 'gain';
      },
      todayMeals,
      targetCalories: targets.target,
      proteinTarget: targets.proteinTarget,
      burnedCalories: burned,
      lastWorkoutName: anyDoneToday ? dayName : undefined,
      rpeScore: 7
    });
  }, [complete, profile, todayMeals, calculateTargets, burned, dayName, anyDoneToday]);

  useEffect(() => {
    if (!snapshot) {
      setAdvice('');
      return;
    }
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
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.card,
    backgroundColor: colors.panel
  },
  label: {
    color: colors.lime,
    fontSize: 11,
    fontFamily: fonts.bodySemi,
    marginBottom: 6,
    letterSpacing: 0.4
  },
  body: {
    color: colors.paperDim,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: fonts.body
  }
});
