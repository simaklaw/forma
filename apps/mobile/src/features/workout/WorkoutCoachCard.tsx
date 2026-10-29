import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  analyzeRecovery,
  buildCoachBrief,
  isProfileComplete,
  type CoachBrief
} from '@forma/core';
import { fonts, radius, spacing, type ColorTokens } from '@/core/theme/tokens';
import { useThemeColors } from '@/core/theme/useThemeColors';
import { selectDailyTotals, selectTodayMeals, useFitPulseStore } from '@/state/useFitPulseStore';

const GLASS_ML = 250;
const WATER_GOAL_ML = 2500;

type Props = {
  dayName: string;
  anyDoneToday: boolean;
};

/**
 * Compact on-device coach strip — structured CoachBrief from RecoveryEngine.
 * No network; no long chat wall on the Workout tab.
 */
export function WorkoutCoachCard({ dayName, anyDoneToday }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const profile = useFitPulseStore((s) => s.profile);
  const allMeals = useFitPulseStore((s) => s.todayMeals);
  const todayMeals = useMemo(() => selectTodayMeals(allMeals), [allMeals]);
  const setLogs = useFitPulseStore((s) => s.setLogs);
  const waterGlasses = useFitPulseStore((s) => s.waterGlasses);
  const calculateTargets = useFitPulseStore((s) => s.calculateTargets);

  const complete = isProfileComplete({
    weightKg: profile.weight,
    heightCm: profile.height,
    age: profile.age,
    gender: profile.sex
  });

  const brief: CoachBrief | null = useMemo(() => {
    if (!complete) return null;
    const dates = [...new Set(setLogs.map((e) => e.dateKey))].sort();
    const workouts = dates.map((date) => ({ date, completed: true as const }));
    const meals = selectDailyTotals(todayMeals);
    const targets = calculateTargets();
    const insight = analyzeRecovery({
      workouts,
      intakeKcal: meals.kcal,
      intakeProteinG: meals.protein,
      targetKcal: targets?.target,
      targetProteinG: targets?.proteinTarget,
      waterLogsMl: waterGlasses * GLASS_ML,
      waterGoalMl: WATER_GOAL_ML
    });
    return buildCoachBrief(insight, dayName);
  }, [complete, setLogs, todayMeals, calculateTargets, waterGlasses, dayName]);

  if (!complete) {
    return (
      <View style={styles.card} accessibilityRole="text">
        <Text style={styles.label}>FITPULSE · Тренер</Text>
        <Text style={styles.body}>
          Заполните профиль (пол, вес, рост, возраст) во вкладке «Профиль» — тогда здесь появится совет
          под день «{dayName}».
        </Text>
      </View>
    );
  }

  if (!brief) return null;

  const headline = anyDoneToday ? brief.restAdvice : brief.workoutAdvice;

  return (
    <View
      style={styles.card}
      accessibilityRole="text"
      accessibilityLabel={`${brief.readinessLabel}, ${brief.readinessScore} процентов`}
    >
      <View style={styles.row}>
        <Text style={styles.label}>
          FITPULSE · {brief.readinessLabel} · offline
        </Text>
        <Text style={styles.score}>{brief.readinessScore}</Text>
      </View>
      <Text style={styles.body} numberOfLines={3}>
        {brief.summary}
      </Text>
      <Text style={styles.advice} numberOfLines={2}>
        {headline}
      </Text>
      <View style={styles.actions}>
        {brief.actionItems.map((item) => (
          <View key={item} style={styles.chip}>
            <Text style={styles.chipText}>{item}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    card: {
      marginBottom: spacing.md,
      marginTop: spacing.sm,
      padding: 14,
      borderRadius: radius.card,
      backgroundColor: colors.surfaceContainer
    },
    row: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      marginBottom: 6
    },
    label: {
      color: colors.lime,
      fontSize: 11,
      fontFamily: fonts.bodySemi,
      letterSpacing: 0.4,
      flex: 1
    },
    score: {
      color: colors.lime,
      fontFamily: fonts.mono,
      fontSize: 22
    },
    body: {
      color: colors.paperDim,
      fontSize: 13,
      lineHeight: 19,
      fontFamily: fonts.body
    },
    advice: {
      color: colors.paper,
      fontSize: 13,
      lineHeight: 18,
      fontFamily: fonts.bodySemi,
      marginTop: 6
    },
    actions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 10
    },
    chip: {
      borderRadius: radius.pill,
      paddingHorizontal: 10,
      paddingVertical: 5,
      backgroundColor: colors.surfaceContainerHigh
    },
    chipText: {
      color: colors.paperDim,
      fontSize: 11,
      fontFamily: fonts.mono
    }
  });
}
