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
import { allExerciseNames, allExerciseMetKeys, allExerciseBurnMeta } from '@/features/workout/catalog';
import ActivityCalendar from '@/components/ActivityCalendar';
import {
  ImportActivityButton,
  ImportedActivitiesList
} from '@/features/import';

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
  const exerciseMetKeys = useMemo(() => allExerciseMetKeys(), []);
  const exerciseBurnMeta = useMemo(() => allExerciseBurnMeta(), []);
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

  const todayBurn = useMemo(
    () =>
      estimateBurnFromSetLogs({
        weightKg: typeof profile.weight === 'number' ? profile.weight : 0,
        setLogs,
        dateKey: todayKey,
        exerciseNames: exerciseMetKeys,
        exerciseMeta: exerciseBurnMeta
      }),
    [profile.weight, setLogs, todayKey, exerciseMetKeys, exerciseBurnMeta]
  );

  const weekBurns = useMemo(
    () =>
      estimateDailyBurns({
        weightKg: typeof profile.weight === 'number' ? profile.weight : 0,
        setLogs,
        dateKeys: weekKeys,
        exerciseNames: exerciseMetKeys,
        exerciseMeta: exerciseBurnMeta
      }),
    [profile.weight, setLogs, weekKeys, exerciseMetKeys, exerciseBurnMeta]
  );

  const recovery = useMemo(
    () =>
      analyzeRecovery({
        workouts: domainWorkouts,
        sleepHoursLastNight: null,
        hrvTrend: null
      }),
    [domainWorkouts]
  );

  const badges = useMemo(
    () =>
      evaluateAchievements({
        totalWorkouts: domainWorkouts.filter((w) => w.completed).length,
        currentStreak: streak,
        personalRecordKg: selectOverallPersonalRecord(personalRecords)
      }),
    [domainWorkouts, streak, personalRecords]
  );

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.ink }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={[styles.eyebrow, { color: colors.lime }]}>FitPulse · аналитика</Text>
        <Text style={[styles.title, { color: colors.paper }]}>Прогресс</Text>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.panel, borderColor: colors.line }]}>
            <Text style={[styles.statVal, { color: colors.paper }]}>{streak}</Text>
            <Text style={[styles.statLbl, { color: colors.paperFaint }]}>серия, дней</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.panel, borderColor: colors.line }]}>
            <Text style={[styles.statVal, { color: colors.paper }]}>{weekSets}</Text>
            <Text style={[styles.statLbl, { color: colors.paperFaint }]}>подходов / 7д</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.panel, borderColor: colors.line }]}>
            <Text style={[styles.statVal, { color: colors.paper }]}>
              {todayBurn > 0 ? `~${todayBurn}` : '—'}
            </Text>
            <Text style={[styles.statLbl, { color: colors.paperFaint }]}>ккал сегодня</Text>
          </View>
        </View>

        <ActivityCalendar setLogs={setLogs} allMeals={allMeals} />

        <View style={styles.importSection}>
          <Text style={[styles.sectionLabel, { color: colors.paperDim }]}>С ЧАСОВ / GPS</Text>
          <ImportActivityButton />
          <ImportedActivitiesList />
        </View>

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
                      borderColor: b.unlocked ? colors.lime : colors.line
                    }
                  ]}
                >
                  <Text style={[styles.badgeTitle, { color: b.unlocked ? colors.lime : colors.paperDim }]}>
                    {b.title}
                  </Text>
                  <Text style={[styles.badgeHint, { color: colors.paperFaint }]}>{b.hint}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {weekBurns.some((d) => d.kcal > 0) ? (
          <View style={[styles.card, { backgroundColor: colors.panel, borderColor: colors.line }]}>
            <Text style={[styles.cardKicker, { color: colors.paperFaint }]}>ЖЖЕНИЕ · 7 ДНЕЙ</Text>
            {weekBurns.map((d) => (
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
    prVal: { fontFamily: fonts.mono, fontSize: 14 },
    importSection: {
      marginTop: spacing.md,
      marginBottom: spacing.md,
      gap: 4
    },
    sectionLabel: {
      fontSize: 11,
      fontFamily: fonts.mono,
      letterSpacing: 0.6,
      marginBottom: 4
    }
  });
}
