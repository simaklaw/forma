import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  analyzeRecovery,
  estimateDailyBurns,
  estimateBurnFromSetLogs,
  evaluateAchievements,
  isProfileComplete,
  toDateKey
} from '@forma/core';
import { fonts, radius, spacing, type ColorTokens } from '@/core/theme/tokens';
import { useThemeColors } from '@/core/theme/useThemeColors';
import { selectDailyTotals, selectTodayMeals, useFitPulseStore } from '@/state/useFitPulseStore';
import { unifiedStreakDays, lastNDays } from '@/engines/WorkoutStats';
import { allExerciseNames } from '@/features/workout/catalog';
import ActivityCalendar from '@/components/ActivityCalendar';

const GLASS_ML = 250;

function workoutsFromSetLogs(
  setLogs: { dateKey: string }[]
): { date: string; completed: boolean }[] {
  const byDate = new Map<string, number>();
  for (const e of setLogs) {
    byDate.set(e.dateKey, (byDate.get(e.dateKey) ?? 0) + 1);
  }
  return [...byDate.keys()]
    .sort()
    .map((date) => ({ date, completed: true }));
}

function selectOverallPersonalRecord(records: Record<number, number>): number | null {
  const values = Object.values(records).filter((w) => Number.isFinite(w) && w > 0);
  return values.length ? Math.max(...values) : null;
}

export default function ProgressScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const setLogs = useFitPulseStore((s) => s.setLogs);
  const personalRecords = useFitPulseStore((s) => s.personalRecords);
  const profile = useFitPulseStore((s) => s.profile);
  const waterGlasses = useFitPulseStore((s) => s.waterGlasses);
  const allMeals = useFitPulseStore((s) => s.todayMeals);
  const todayMeals = useMemo(() => selectTodayMeals(allMeals), [allMeals]);
  const calcTargets = useFitPulseStore((s) => s.calculateTargets);
  const metabolic = useFitPulseStore((s) => s.metabolic);

  const exerciseNames = useMemo(() => allExerciseNames(), []);
  const todayKey = useMemo(() => toDateKey(new Date()), []);

  const weekKeys = useMemo(() => lastNDays(7).map((d) => toDateKey(d)), []);
  const weekSets = useMemo(() => {
    const set = new Set(weekKeys);
    return setLogs.filter((e) => set.has(e.dateKey)).length;
  }, [setLogs, weekKeys]);

  const activeDays = useMemo(() => {
    const dates = new Set(setLogs.map((e) => e.dateKey));
    return weekKeys.filter((k) => dates.has(k)).length;
  }, [setLogs, weekKeys]);

  const streak = useMemo(() => unifiedStreakDays(setLogs, allMeals), [setLogs, allMeals]);

  const domainWorkouts = useMemo(() => workoutsFromSetLogs(setLogs), [setLogs]);
  const mealTotals = useMemo(() => selectDailyTotals(todayMeals), [todayMeals]);
  const profileComplete = isProfileComplete({
    weightKg: profile.weight,
    heightCm: profile.height,
    age: profile.age,
    gender: profile.sex
  });
  const targetSnapshot = useMemo(
    () => (profileComplete ? calcTargets() : null),
    [profileComplete, calcTargets, profile, metabolic]
  );

  const recovery = useMemo(
    () =>
      analyzeRecovery({
        workouts: domainWorkouts,
        intakeKcal: mealTotals.kcal,
        intakeProteinG: mealTotals.protein,
        targetKcal: targetSnapshot?.target,
        targetProteinG: targetSnapshot?.proteinTarget,
        waterLogsMl: waterGlasses * GLASS_ML,
        waterGoalMl: 2500
      }),
    [domainWorkouts, mealTotals, targetSnapshot, waterGlasses]
  );

  const badges = useMemo(
    () =>
      evaluateAchievements({
        workouts: domainWorkouts,
        proteinTodayG: mealTotals.protein,
        proteinGoalG: targetSnapshot?.proteinTarget ?? null,
        restDay:
          recovery.status === 'rest_required' ||
          recovery.status === 'active_recovery_recommended',
        doneToday: domainWorkouts.some((w) => w.date === todayKey && w.completed)
      }),
    [domainWorkouts, mealTotals.protein, targetSnapshot?.proteinTarget, recovery.status, todayKey]
  );

  const recoveryPillars = [
    { id: 'muscular', label: 'Мышцы', score: recovery.muscularReadiness },
    { id: 'energy', label: 'Энергия', score: recovery.energyRestoration },
    { id: 'hydration', label: 'Вода', score: recovery.hydrationScore },
    { id: 'cns', label: 'ЦНС', score: recovery.cnsFreshness }
  ];

  const bestPr = selectOverallPersonalRecord(personalRecords);

  const topPrs = useMemo(() => {
    return Object.entries(personalRecords)
      .map(([id, w]) => {
        const exerciseId = Number(id);
        return {
          exerciseId,
          weight: w,
          name: exerciseNames[exerciseId] ?? `Упр. #${exerciseId}`
        };
      })
      .filter((r) => Number.isFinite(r.weight) && r.weight > 0)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 5);
  }, [personalRecords, exerciseNames]);

  const burnSeries = useMemo(() => {
    const days = lastNDays(7);
    const safeWeight =
      typeof profile.weight === 'number' && Number.isFinite(profile.weight) && profile.weight > 0
        ? profile.weight
        : 0;
    return estimateDailyBurns({
      weightKg: safeWeight,
      setLogs,
      dateKeys: days.map((d) => toDateKey(d)),
      exerciseNames
    });
  }, [setLogs, profile.weight, exerciseNames]);

  const todayBurn = useMemo(() => {
    const safeWeight =
      typeof profile.weight === 'number' && Number.isFinite(profile.weight) && profile.weight > 0
        ? profile.weight
        : 0;
    return estimateBurnFromSetLogs({
      weightKg: safeWeight,
      setLogs,
      dateKey: todayKey,
      exerciseNames
    });
  }, [setLogs, profile.weight, todayKey, exerciseNames]);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.ink }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={[styles.eyebrow, { color: colors.lime }]}>FitPulse · аналитика</Text>
        <Text style={[styles.title, { color: colors.paper }]}>Прогресс</Text>

        <View style={[styles.card, { backgroundColor: colors.panel, borderColor: colors.line }]}>
          <Text style={[styles.cardKicker, { color: colors.paperFaint }]}>ВОССТАНОВЛЕНИЕ</Text>
          <View style={styles.recoveryRow}>
            <Text style={[styles.score, { color: colors.lime }]}>{recovery.recoveryScore}%</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.status, { color: colors.paper }]}>{recovery.statusLabel}</Text>
              <Text style={[styles.hint, { color: colors.paperDim }]}>
                {recovery.recommendationTitle}
              </Text>
            </View>
          </View>
          <View style={styles.pillars}>
            {recoveryPillars.map((p) => (
              <View key={p.id} style={[styles.pillar, { borderColor: colors.line }]}>
                <Text style={[styles.pillarVal, { color: colors.paper }]}>{p.score}</Text>
                <Text style={[styles.pillarLbl, { color: colors.paperFaint }]}>{p.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.panel, borderColor: colors.line }]}>
            <Text style={[styles.statVal, { color: colors.paper }]}>{streak}</Text>
            <Text style={[styles.statLbl, { color: colors.paperFaint }]}>серия, дн</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.panel, borderColor: colors.line }]}>
            <Text style={[styles.statVal, { color: colors.paper }]}>{activeDays}/7</Text>
            <Text style={[styles.statLbl, { color: colors.paperFaint }]}>дней недели</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.panel, borderColor: colors.line }]}>
            <Text style={[styles.statVal, { color: colors.paper }]}>
              {todayBurn > 0 ? `~${todayBurn}` : '—'}
            </Text>
            <Text style={[styles.statLbl, { color: colors.paperFaint }]}>ккал сегодня</Text>
          </View>
        </View>

        <ActivityCalendar setLogs={setLogs} allMeals={allMeals} />

        {badges.length > 0 ? (
          <View style={[styles.card, { backgroundColor: colors.panel, borderColor: colors.line }]}>
            <Text style={[styles.cardKicker, { color: colors.paperFaint }]}>ДОСТИЖЕНИЯ</Text>
            <View style={styles.badgeGrid}>
              {badges.map((b) => (
                <View
                  key={b.id}
                  style={[
                    styles.badge,
                    {
                      backgroundColor: colors.ink,
                      borderColor: b.unlocked ? colors.lime : colors.line,
                      opacity: b.unlocked ? 1 : 0.45
                    }
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeTitle,
                      { color: b.unlocked ? colors.lime : colors.paperDim }
                    ]}
                    numberOfLines={2}
                  >
                    {b.title}
                  </Text>
                  <Text style={[styles.badgeHint, { color: colors.paperFaint }]} numberOfLines={2}>
                    {b.hint}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <View style={[styles.card, { backgroundColor: colors.panel, borderColor: colors.line }]}>
          <Text style={[styles.cardKicker, { color: colors.paperFaint }]}>НЕДЕЛЯ · ПОДХОДЫ</Text>
          <Text style={[styles.statVal, { color: colors.paper }]}>{weekSets}</Text>
          <Text style={[styles.hint, { color: colors.paperDim }]}>
            За 7 дней · рекорд {bestPr != null ? `${bestPr} кг` : '—'}
          </Text>
        </View>

        {topPrs.length > 0 ? (
          <View style={[styles.card, { backgroundColor: colors.panel, borderColor: colors.line }]}>
            <Text style={[styles.cardKicker, { color: colors.paperFaint }]}>ЛИЧНЫЕ РЕКОРДЫ</Text>
            {topPrs.map((r) => (
              <View key={r.exerciseId} style={styles.prRow}>
                <Text style={[styles.prName, { color: colors.paper }]} numberOfLines={1}>
                  {r.name}
                </Text>
                <Text style={[styles.prVal, { color: colors.lime }]}>{r.weight} кг</Text>
              </View>
            ))}
          </View>
        ) : null}

        {burnSeries.some((d) => d.kcal > 0) ? (
          <View style={[styles.card, { backgroundColor: colors.panel, borderColor: colors.line }]}>
            <Text style={[styles.cardKicker, { color: colors.paperFaint }]}>РАСХОД · 7 ДНЕЙ</Text>
            {burnSeries.map((d) => (
              <View key={d.dateKey} style={styles.prRow}>
                <Text style={[styles.prName, { color: colors.paperDim }]}>{d.dateKey.slice(5)}</Text>
                <Text style={[styles.prVal, { color: colors.paper }]}>
                  {d.kcal > 0 ? `~${d.kcal}` : '—'}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    screen: { flex: 1 },
    body: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 40 },
    eyebrow: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1, marginBottom: 4 },
    title: { fontFamily: fonts.mono, fontSize: 28, marginBottom: spacing.md },
    card: {
      borderWidth: 1,
      borderRadius: radius.card,
      padding: spacing.md,
      marginBottom: spacing.md
    },
    cardKicker: { fontFamily: fonts.mono, fontSize: 11, marginBottom: 8 },
    recoveryRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    score: { fontFamily: fonts.mono, fontSize: 36 },
    status: { fontFamily: fonts.bodySemi, fontSize: 16 },
    hint: { fontFamily: fonts.body, fontSize: 13, marginTop: 4, lineHeight: 18 },
    pillars: { flexDirection: 'row', marginTop: spacing.md, gap: 8 },
    pillar: {
      flex: 1,
      borderWidth: 1,
      borderRadius: radius.control,
      paddingVertical: 10,
      alignItems: 'center'
    },
    pillarVal: { fontFamily: fonts.mono, fontSize: 16 },
    pillarLbl: { fontFamily: fonts.body, fontSize: 10, marginTop: 2 },
    statsRow: { flexDirection: 'row', gap: 8, marginBottom: spacing.md },
    statCard: {
      flex: 1,
      borderWidth: 1,
      borderRadius: radius.card,
      padding: spacing.sm,
      alignItems: 'center'
    },
    statVal: { fontFamily: fonts.mono, fontSize: 20 },
    statLbl: { fontFamily: fonts.body, fontSize: 10, marginTop: 2 },
    badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    badge: {
      width: '30%',
      flexGrow: 1,
      borderWidth: 1,
      borderRadius: radius.control,
      padding: 10,
      minHeight: 72
    },
    badgeTitle: { fontFamily: fonts.bodySemi, fontSize: 12 },
    badgeHint: { fontFamily: fonts.body, fontSize: 10, marginTop: 4 },
    prRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 6
    },
    prName: { fontFamily: fonts.body, fontSize: 14, flex: 1, marginRight: 8 },
    prVal: { fontFamily: fonts.mono, fontSize: 14 }
  });
}
