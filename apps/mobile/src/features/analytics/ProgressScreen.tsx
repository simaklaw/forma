import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  analyzeRecovery,
  buildCoachBrief,
  estimateDailyBurns,
  estimateBurnFromSetLogs,
  evaluateAchievements,
  isProfileComplete,
  plateauAnalyses,
  strengthTrends,
  toDateKey,
  type PlateauAnalysis
} from '@forma/core';
import { fonts, radius, spacing, type ColorTokens } from '@/core/theme/tokens';
import { useThemeColors } from '@/core/theme/useThemeColors';
import { useT } from '@/i18n/strings';
import { selectDailyTotals, selectTodayMeals, useFitPulseStore } from '@/state/useFitPulseStore';
import { unifiedStreakDays, lastNDays } from '@/engines/WorkoutStats';
import { allExerciseNames, allExerciseMetKeys, allExerciseBurnMeta } from '@/features/workout/catalog';
import { importedByNumericId } from '@/features/workout/importedExerciseBridge';
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

/** Порядок статусов в карточке: сначала требующие внимания. */
const STATUS_PRIORITY: Record<PlateauAnalysis['status'], number> = {
  dipping: 0,
  static_plateau: 1,
  plateau: 2,
  growing: 3,
  insufficient_data: 4
};

export default function ProgressScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const t = useT();

  const setLogs = useFitPulseStore((s) => s.setLogs);
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

  const recovery = useMemo(() => {
    const meals = selectDailyTotals(todayMeals);
    return analyzeRecovery({
      workouts: domainWorkouts,
      intakeKcal: meals.kcal,
      intakeProteinG: meals.protein,
      targetKcal: targetSnapshot?.target,
      targetProteinG: targetSnapshot?.proteinTarget,
      waterLogsMl: waterGlasses * GLASS_ML,
      waterGoalMl: 2500
    });
  }, [domainWorkouts, todayMeals, targetSnapshot, waterGlasses]);

  const coachBrief = useMemo(() => buildCoachBrief(recovery), [recovery]);

  const badges = useMemo(
    () =>
      evaluateAchievements({
        workouts: domainWorkouts.map((w) => ({ date: w.date, completed: w.completed }))
      }),
    [domainWorkouts]
  );
  const strengthTop = useMemo(() => strengthTrends(setLogs).slice(0, 3), [setLogs]);
  const plateauList = useMemo(
    () =>
      plateauAnalyses(setLogs)
        .filter((p) => p.status !== 'insufficient_data')
        .sort((a, b) => STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status])
        .slice(0, 6),
    [setLogs]
  );
  const resolveStrengthName = (exerciseId: number): string => {
    const imported = importedByNumericId(exerciseId);
    if (imported) return imported.nameRu ?? imported.nameEn;
    return exerciseNames[exerciseId] ?? '—';
  };

  const statusLabel = (status: PlateauAnalysis['status']): string =>
    status === 'growing'
      ? t('statusGrowing')
      : status === 'plateau'
        ? t('statusPlateau')
          : status === 'static_plateau'
            ? t('statusStatic')
              : status === 'dipping'
                ? t('statusDipping')
                  : t('statusInsufficient');

  const suggestionLabel = (suggestion: PlateauAnalysis['suggestion']): string =>
    suggestion === 'keep_pushing'
      ? t('statusSuggestKeep')
      : suggestion === 'add_rep_or_weight'
        ? t('statusSuggestProgress')
          : suggestion === 'change_scheme'
            ? t('statusSuggestChange')
              : suggestion === 'check_recovery'
                ? t('statusSuggestRecover')
                  : t('statusSuggestLog');


  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.ink }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={[styles.eyebrow, { color: colors.lime }]}>{t('progressEyebrow')}</Text>
        <Text style={[styles.title, { color: colors.paper }]}>{t('tabProgress')}</Text>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.panel, borderColor: colors.line }]}>
            <Text style={[styles.statVal, { color: colors.paper }]}>{streak}</Text>
            <Text style={[styles.statLbl, { color: colors.paperFaint }]}>{t('progressStatStreak')}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.panel, borderColor: colors.line }]}>
            <Text style={[styles.statVal, { color: colors.paper }]}>{weekSets}</Text>
            <Text style={[styles.statLbl, { color: colors.paperFaint }]}>{t('progressStatSets')}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.panel, borderColor: colors.line }]}>
            <Text style={[styles.statVal, { color: colors.paper }]}>
              {todayBurn > 0 ? `~${todayBurn}` : '—'}
            </Text>
            <Text style={[styles.statLbl, { color: colors.paperFaint }]}>{t('progressStatKcal')}</Text>
          </View>
        </View>

        <View
          style={[styles.card, { backgroundColor: colors.panel, borderColor: colors.line }]}
          accessibilityRole="summary"
          accessibilityLabel={t('progressRecoveryA11y', {
            score: recovery.recoveryScore,
            status: recovery.statusLabel
          })}
        >
          <Text style={[styles.cardKicker, { color: colors.paperFaint }]}>{t('progressRecoveryKicker')}</Text>
          <View style={styles.recoveryRow}>
            <Text
              style={[
                styles.score,
                {
                  color:
                    coachBrief.readinessStatus === 'rest_required' || coachBrief.readinessStatus === 'fatigued'
                      ? colors.ember
                      : colors.lime
                }
              ]}
            >
              {recovery.recoveryScore}
            </Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.status, { color: colors.paper }]}>{recovery.statusLabel}</Text>
              <Text style={[styles.hint, { color: colors.paperDim }]} numberOfLines={3}>
                {coachBrief.summary}
              </Text>
            </View>
          </View>
          <View style={styles.pillars}>
            {(
              [
                [t('progressMuscles'), recovery.muscularReadiness],
                [t('progressEnergy'), recovery.energyRestoration],
                [t('progressWater'), recovery.hydrationScore],
                [t('progressCns'), recovery.cnsFreshness]
              ] as const
            ).map(([lbl, val]) => (
              <View key={lbl} style={[styles.pillar, { borderColor: colors.line }]}>
                <Text style={[styles.pillarVal, { color: colors.paper }]}>{val}</Text>
                <Text style={[styles.pillarLbl, { color: colors.paperFaint }]}>{lbl}</Text>
              </View>
            ))}
          </View>
          {coachBrief.actionItems.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.md }}>
              {coachBrief.actionItems.map((item) => (
                <View
                  key={item}
                  style={{
                    borderRadius: radius.pill,
                    borderWidth: 1,
                    borderColor: colors.lineStrong,
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    backgroundColor: colors.panelRaised
                  }}
                >
                  <Text style={{ color: colors.paperDim, fontSize: 11, fontFamily: fonts.mono }}>{item}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        <ActivityCalendar setLogs={setLogs} allMeals={allMeals} />

        <View style={styles.importSection}>
          <Text style={[styles.sectionLabel, { color: colors.paperDim }]}>{t('progressImportSection')}</Text>
          <ImportActivityButton />
          <ImportedActivitiesList />
        </View>

        {badges.length > 0 ? (
          <View style={[styles.card, { backgroundColor: colors.panel, borderColor: colors.line }]}>
            <Text style={[styles.cardKicker, { color: colors.paperFaint }]}>{t('progressAchievements')}</Text>
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

        {strengthTop.length > 0 ? (
          <View style={[styles.card, { backgroundColor: colors.panel, borderColor: colors.line }]}>
            <Text style={[styles.cardKicker, { color: colors.paperFaint }]}>{t('progressStrengthKicker')}</Text>
            {strengthTop.map((s) => {
              const delta =
                s.deltaKg != null && s.deltaKg !== 0
                  ? s.deltaKg > 0
                    ? t('strengthDeltaUp', { kg: s.deltaKg })
                    : t('strengthDeltaDown', { kg: Math.abs(s.deltaKg) })
                  : null;
              return (
                <View key={s.exerciseId} style={styles.prRow}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={[styles.prName, { color: colors.paper }]} numberOfLines={1}>
                      {resolveStrengthName(s.exerciseId)}
                    </Text>
                    <Text style={{ color: colors.paperFaint, fontSize: 11, fontFamily: fonts.mono }}>
                      {t('strengthVolume', { kg: s.totalVolumeKg })}
                    </Text>
                    {s.trend != null ? (
                      <Text
                        style={{
                          color:
                            s.trend === 'improving'
                              ? colors.lime
                              : s.trend === 'declining'
                                ? colors.ember
                                : colors.paperFaint,
                          fontSize: 11,
                          fontFamily: fonts.mono,
                          marginTop: 2
                        }}
                      >
                        {s.trend === 'improving'
                          ? t('strengthTrendUp')
                          : s.trend === 'declining'
                            ? t('strengthTrendDown')
                            : t('strengthTrendStable')}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={[styles.prVal, { color: colors.paper }]}>
                    {s.currentOneRmKg > 0 ? s.currentOneRmKg : s.bestOneRmKg} {t('kg')}
                  </Text>
                  {delta ? (
                    <Text
                      style={{
                        fontFamily: fonts.mono,
                        fontSize: 11,
                        marginLeft: 8,
                        color: s.deltaKg != null && s.deltaKg > 0 ? colors.lime : colors.ember
                      }}
                    >
                      {delta}
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : null}
        {plateauList.length > 0 ? (
          <View style={[styles.card, { backgroundColor: colors.panel, borderColor: colors.line }]}>
            <Text style={[styles.cardKicker, { color: colors.paperFaint }]}>{t('progressStatusKicker')}</Text>
            {plateauList.map((p) => (
              <View key={p.exerciseId} style={styles.statusRow}>
                <Text style={[styles.prName, { color: colors.paper }]} numberOfLines={1}>
                  {resolveStrengthName(p.exerciseId)}
                </Text>
                <Text
                  style={{
                    fontFamily: fonts.mono,
                    fontSize: 11,
                    marginTop: 2,
                    color:
                      p.status === 'growing'
                        ? colors.lime
                        : p.status === 'dipping'
                          ? colors.ember
                          : colors.paperDim
                  }}
                >
                  {statusLabel(p.status)}
                </Text>
                <Text style={{ color: colors.paperFaint, fontSize: 11, marginTop: 2 }}>
                  {suggestionLabel(p.suggestion)}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
        {weekBurns.some((d) => d.kcal > 0) ? (
          <View style={[styles.card, { backgroundColor: colors.panel, borderColor: colors.line }]}>
            <Text style={[styles.cardKicker, { color: colors.paperFaint }]}>{t('progressBurnWeek')}</Text>
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
    statusRow: { paddingVertical: 8 },
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
