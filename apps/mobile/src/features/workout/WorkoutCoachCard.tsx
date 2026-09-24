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

/** On-device coach strip — shows gate / loading / advice (never silent null when mounted). */
export function WorkoutCoachCard({ dayName, anyDoneToday, exerciseNames }: Props) {
  const profile = useFitPulseStore((s) => s.profile);
  const todayMeals = useFitPulseStore((s) => s.todayMeals);
  const setLogs = useFitPulseStore((s) => s.setLogs);
  const calculateTargets = useFitPulseStore((s) => s.calculateTargets);
  const [advice, setAdvice] = useState('');
  const [loading, setLoading] = useState(false);

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

  const proteinTarget = useMemo(() => {
    if (!complete) return 0;
    return calculateTargets().proteinTarget;
  }, [complete, calculateTargets, profile.weight, profile.height, profile.age, profile.sex, profile.pal, profile.goal]);

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
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const prompt = anyDoneToday ? 'восстановление после тренировки' : 'совет на тренировку';
    CoachEngine.getTrainer()
      .generateAdvice(snapshot, prompt)
      .then((text) => {
        if (!cancelled) {
          setAdvice(text);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAdvice('Локальный тренер недоступен. Проверьте профиль и попробуйте снова.');
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [snapshot, anyDoneToday]);

  const labelBits = ['FORMA · Тренер'];
  if (burned > 0) labelBits.push(`~${burned} ккал`);

  let body: string;
  if (!complete) {
    body =
      'Заполните профиль (пол, вес, рост, возраст) — тогда здесь появится совет под день «' +
      dayName +
      '». Вес по умолчанию не подставляется.';
  } else if (loading && !advice) {
    body = 'Думаю…';
  } else if (advice) {
    body = advice;
  } else {
    body = 'Думаю…';
  }

  return (
    <View style={styles.card} accessibilityRole="text">
      <Text style={styles.label}>{labelBits.join(' · ')}</Text>
      {complete && proteinTarget > 0 ? (
        <Text style={styles.meta}>Белок сегодня: цель {proteinTarget} г</Text>
      ) : null}
      <Text style={styles.body}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
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
    marginBottom: 4,
    letterSpacing: 0.4
  },
  meta: {
    color: colors.paperFaint,
    fontSize: 11,
    fontFamily: fonts.mono,
    marginBottom: 6
  },
  body: {
    color: colors.paperDim,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: fonts.body
  }
});
