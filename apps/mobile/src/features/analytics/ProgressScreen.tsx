import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  analyzeRecovery,
  buildCoachBrief,
  daySetReview,
  e1RmDailyBests,
  estimateDailyBurns,
  estimateBurnFromSetLogs,
  evaluateAchievements,
  isProfileComplete,
  muscleVolumeStats,
  patternVolumeStats,
  pushPullBalance,
  personalRecords,
  plateauAnalyses,
  strengthTrends,
  toDateKey,
  type DaySetReview,
  type MovementPattern,
  type MuscleLoadStatus,
  type PlateauAnalysis,
  type RecordEvent,
  type SetScenario
} from '@forma/core';
import { fonts, radius, spacing, type ColorTokens } from '@/core/theme/tokens';
import { useThemeColors } from '@/core/theme/useThemeColors';
import { movementPatternLabel, useT } from '@/i18n/strings';
import { useLanguageStore } from '@/i18n/useLanguageStore';
import { selectDailyTotals, selectTodayMeals, useFitPulseStore } from '@/state/useFitPulseStore';
import { useStreakFreezeStore } from '@/state/useStreakFreezeStore';
import { unifiedStreakDays, lastNDays } from '@/engines/WorkoutStats';
import { FREEZES_PER_MONTH, freezesLeftInMonth } from '@/engines/streakFreeze';
import {
  allExerciseBurnMeta,
  allExerciseMetKeys,
  allExerciseMuscles,
  allExerciseNames
} from '@/features/workout/catalog';
import { allExercisePatterns } from '@/features/workout/exercisePatterns';
import { MUSCLE_LABELS, type MuscleKey } from '@/domain/muscleKeys';
import { importedByNumericId } from '@/features/workout/importedExerciseBridge';
import {
  dailyNutritionTotals,
  nutritionWindowSummary,
  windowDailyNutrition,
  type TrendWindow
} from '@/features/nutrition/nutritionTrends';
import ActivityCalendar from '@/components/ActivityCalendar';
import WeightChart from '@/components/WeightChart';
import MuscleLoadMap from '@/components/MuscleLoadMap';
import {
  ImportActivityButton,
  ImportGymHistoryButton,
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
  const lang = useLanguageStore((s) => s.lang);

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

  const frozenDates = useStreakFreezeStore((s) => s.frozenDates);
  const streak = useMemo(
    () => unifiedStreakDays(setLogs, allMeals, new Date(), frozenDates),
    [setLogs, allMeals, frozenDates]
  );
  const freezesLeft = freezesLeftInMonth(frozenDates, todayKey);

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

  // Тренды питания: средние ккал/белок за окно 7/30/90 дней (по мотивам OpenNutriTracker).
  const nutritionDaily = useMemo(() => dailyNutritionTotals(allMeals), [allMeals]);
  const [nutritionWindowDays, setNutritionWindowDays] = useState<TrendWindow>(7);
  const nutritionSummary = useMemo(
    () => nutritionWindowSummary(nutritionDaily, nutritionWindowDays),
    [nutritionDaily, nutritionWindowDays]
  );
  const nutritionChart = useMemo(
    () => windowDailyNutrition(nutritionDaily, nutritionWindowDays),
    [nutritionDaily, nutritionWindowDays]
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
  const strengthAll = useMemo(() => strengthTrends(setLogs), [setLogs]);
  const strengthTop = strengthAll.slice(0, 3);
  const chartExercises = strengthAll.slice(0, 6);
  const [selectedExerciseId, setSelectedExerciseId] = useState<number | null>(null);
  const chartExerciseId =
    chartExercises.find((s) => s.exerciseId === selectedExerciseId)?.exerciseId ??
    chartExercises[0]?.exerciseId ??
    null;
  const e1rmSeries = useMemo(
    () => (chartExerciseId == null ? [] : e1RmDailyBests(setLogs, chartExerciseId)),
    [setLogs, chartExerciseId]
  );
  const plateauList = useMemo(
    () =>
      plateauAnalyses(setLogs)
        .filter((p) => p.status !== 'insufficient_data')
        .sort((a, b) => STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status])
        .slice(0, 6),
    [setLogs]
  );
  const recordFeed = useMemo(() => {
    const byExercise = personalRecords(setLogs);
    const events = byExercise.flatMap((r) =>
      r.events.map((e) => ({ ...e, exerciseId: r.exerciseId }))
    );
    events.sort((a, b) => (a.dateKey < b.dateKey ? 1 : a.dateKey > b.dateKey ? -1 : 0));
    const droughts = byExercise
      .filter((r) => r.droughtLevel !== 'none')
      .sort((a, b) => b.droughtWeeks - a.droughtWeeks)
      .slice(0, 3);
    return { feed: events.slice(0, 6), droughts };
  }, [setLogs]);
  const muscleVolumeAll = useMemo(
    () => muscleVolumeStats(setLogs, allExerciseMuscles(), new Date()),
    [setLogs]
  );
  const muscleVolume = muscleVolumeAll.slice(0, 6);
  const patternVolume = useMemo(
    () => patternVolumeStats(setLogs, allExercisePatterns(), new Date()),
    [setLogs]
  );
  const pushPull = useMemo(() => pushPullBalance(patternVolume), [patternVolume]);

  const lastReview = useMemo((): DaySetReview | null => {
    if (setLogs.length === 0) return null;
    const lastDay = setLogs.reduce((acc, e) => (e.dateKey > acc ? e.dateKey : acc), '');
    const review = daySetReview(setLogs, lastDay);
    return review.exercises.length === 0 ? null : review;
  }, [setLogs]);

  const reviewLines = useMemo(() => {
    if (!lastReview) return [];
    return lastReview.exercises.map((ex) => {
      const counts = new Map<SetScenario, number>();
      for (const s of ex.sets) {
        counts.set(s.scenario, (counts.get(s.scenario) ?? 0) + 1);
      }
      return {
        exerciseId: ex.exerciseId,
        effectiveSets: ex.effectiveSets,
        totalSets: ex.totalSets,
        parts: [...counts.entries()].map(([scenario, n]) => ({ scenario, n }))
      };
    });
  }, [lastReview]);

  const volumeLabel = (muscle: string): string => MUSCLE_LABELS[muscle as MuscleKey] ?? muscle;

  const volumeStatusLabel = (status: MuscleLoadStatus): string =>
    status === 'junk'
      ? t('volumeStatusJunk')
      : status === 'under'
        ? t('volumeStatusUnder')
        : t('volumeStatusOptimal');

  const scenarioLabel = (scenario: SetScenario): string =>
    scenario === 'warmup'
      ? t('reviewScenarioWarmup')
      : scenario === 'easy'
        ? t('reviewScenarioEasy')
        : scenario === 'productive'
          ? t('reviewScenarioProductive')
          : scenario === 'grinder'
            ? t('reviewScenarioGrinder')
            : scenario === 'failure'
              ? t('reviewScenarioFailure')
              : t('reviewScenarioBackoff');

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

  const recordTypeLabel = (type: RecordEvent['type']): string =>
    type === 'max_weight'
      ? t('recordTypeWeight')
      : type === 'max_reps'
        ? t('recordTypeReps')
        : type === 'max_e1rm'
          ? t('recordTypeE1rm')
          : type === 'max_set_volume'
            ? t('recordTypeSetVolume')
            : t('recordTypeSessionVolume');

  const recordValueLabel = (e: RecordEvent): string =>
    e.type === 'max_reps' ? `${e.value} ${t('sheetRepsUnit')}` : `${e.value} ${t('kg')}`;

  const recordTierLabel = (e: RecordEvent): string =>
    e.tier === 'gold'
      ? t('recordTierGold')
      : e.tier === 'silver'
        ? t('recordTierSilver', { pct: e.improvementPct ?? 0 })
        : t('recordTierBronze');


  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.ink }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={[styles.eyebrow, { color: colors.lime }]}>{t('progressEyebrow')}</Text>
        <Text style={[styles.title, { color: colors.paper }]}>{t('tabProgress')}</Text>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.panel, borderColor: colors.line }]}>
            <Text style={[styles.statVal, { color: colors.paper }]}>{streak}</Text>
            <Text style={[styles.statLbl, { color: colors.paperFaint }]}>{t('progressStatStreak')}</Text>
            <Text style={[styles.statFreeze, { color: colors.paperFaint }]}>
              🧊 {freezesLeft}/{FREEZES_PER_MONTH}
            </Text>
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

        <ActivityCalendar setLogs={setLogs} allMeals={allMeals} frozenDates={frozenDates} />

        {nutritionDaily.length > 0 ? (
          <View style={[styles.card, { backgroundColor: colors.panel, borderColor: colors.line }]}>
            <Text style={[styles.cardKicker, { color: colors.paperFaint }]}>
              {t('progressNutritionKicker')}
            </Text>
            <View style={styles.chipRow}>
              {([7, 30, 90] as const).map((days) => {
                const active = days === nutritionWindowDays;
                return (
                  <TouchableOpacity
                    key={days}
                    style={[styles.chartChip, { borderColor: active ? colors.lime : colors.lineStrong }]}
                    onPress={() => setNutritionWindowDays(days)}
                    accessibilityRole="button"
                    accessibilityLabel={t('progressNutritionChipA11y', { days })}
                  >
                    <Text style={[styles.chartChipText, { color: active ? colors.lime : colors.paperDim }]}>
                      {t('progressNutritionChip', { days })}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.prRow}>
              <Text style={[styles.prName, { color: colors.paperDim }]}>
                {t('progressNutritionAvgKcal')}
              </Text>
              <Text style={[styles.prVal, { color: colors.paper }]}>
                {nutritionSummary.avgKcal.toLocaleString(lang === 'en' ? 'en-US' : 'ru-RU')}
              </Text>
            </View>
            <View style={styles.prRow}>
              <Text style={[styles.prName, { color: colors.paperDim }]}>
                {t('progressNutritionAvgProtein')}
              </Text>
              <Text style={[styles.prVal, { color: colors.paper }]}>{nutritionSummary.avgProtein}</Text>
            </View>
            <Text style={{ color: colors.paperFaint, fontSize: 11, fontFamily: fonts.mono, marginTop: 2 }}>
              {t('progressNutritionDays', { days: nutritionSummary.daysLogged })}
            </Text>
            {nutritionChart.length >= 2 ? (
              <View>
                <WeightChart history={nutritionChart.map((d) => d.kcal)} />
                <Text
                  style={{
                    color: colors.paperFaint,
                    fontSize: 11,
                    fontFamily: fonts.mono,
                    marginTop: 4
                  }}
                >
                  {nutritionChart[0].dateKey.slice(5)} →{' '}
                  {nutritionChart[nutritionChart.length - 1].dateKey.slice(5)}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={styles.importSection}>
          <Text style={[styles.sectionLabel, { color: colors.paperDim }]}>{t('progressImportSection')}</Text>
          <ImportActivityButton />
          <ImportGymHistoryButton />
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
        {chartExercises.length > 0 ? (
          <View style={[styles.card, { backgroundColor: colors.panel, borderColor: colors.line }]}>
            <Text style={[styles.cardKicker, { color: colors.paperFaint }]}>
              {t('progressE1rmChartKicker')}
            </Text>
            <View style={styles.chipRow}>
              {chartExercises.map((s) => {
                const active = s.exerciseId === chartExerciseId;
                return (
                  <TouchableOpacity
                    key={s.exerciseId}
                    style={[
                      styles.chartChip,
                      { borderColor: active ? colors.lime : colors.lineStrong }
                    ]}
                    onPress={() => setSelectedExerciseId(s.exerciseId)}
                    accessibilityRole="button"
                    accessibilityLabel={resolveStrengthName(s.exerciseId)}
                  >
                    <Text
                      style={[styles.chartChipText, { color: active ? colors.lime : colors.paperDim }]}
                      numberOfLines={1}
                    >
                      {resolveStrengthName(s.exerciseId)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {e1rmSeries.length >= 2 ? (
              <View>
                <WeightChart history={e1rmSeries.map((p) => p.oneRmKg)} />
                <Text
                  style={{
                    color: colors.paperFaint,
                    fontSize: 11,
                    fontFamily: fonts.mono,
                    marginTop: 4
                  }}
                >
                  {e1rmSeries[0]!.dateKey.slice(5)} →{' '}
                  {e1rmSeries[e1rmSeries.length - 1]!.dateKey.slice(5)} ·{" "}
                  {e1rmSeries[e1rmSeries.length - 1]!.oneRmKg} {t("kg")}
                </Text>
              </View>
            ) : (
              <Text style={{ color: colors.paperFaint, fontSize: 11 }}>
                {t('e1rmChartEmpty')}
              </Text>
            )}
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
        {recordFeed.feed.length > 0 || recordFeed.droughts.length > 0 ? (
          <View style={[styles.card, { backgroundColor: colors.panel, borderColor: colors.line }]}>
            <Text style={[styles.cardKicker, { color: colors.paperFaint }]}>{t('recordsKicker')}</Text>
            {recordFeed.feed.map((e) => (
              <View key={`${e.exerciseId}-${e.dateKey}-${e.type}`} style={styles.statusRow}>
                <Text style={[styles.prName, { color: colors.paper }]} numberOfLines={1}>
                  {resolveStrengthName(e.exerciseId)}
                </Text>
                <Text style={{ fontFamily: fonts.mono, fontSize: 11, marginTop: 2, color: colors.paperDim }}>
                  {recordTypeLabel(e.type)} · {recordValueLabel(e)}
                </Text>
                <Text style={{ color: colors.paperFaint, fontSize: 11, marginTop: 2 }}>
                  {recordTierLabel(e)} · {e.dateKey.slice(5)}
                </Text>
                {e.premature ? (
                  <Text style={{ color: colors.ember, fontSize: 11, marginTop: 2 }}>
                    {t('recordPremature')}
                  </Text>
                ) : null}
              </View>
            ))}
            {recordFeed.droughts.map((d) => (
              <View key={`drought-${d.exerciseId}`} style={styles.statusRow}>
                <Text style={[styles.prName, { color: colors.paperDim }]} numberOfLines={1}>
                  {resolveStrengthName(d.exerciseId)}
                </Text>
                <Text style={{ color: colors.ember, fontSize: 11, marginTop: 2 }}>
                  {t('recordDrought', { weeks: d.droughtWeeks })}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
        {muscleVolume.length > 0 ? (
          <View style={[styles.card, { backgroundColor: colors.panel, borderColor: colors.line }]}>
            <Text style={[styles.cardKicker, { color: colors.paperFaint }]}>{t('volumeKicker')}</Text>
            <MuscleLoadMap loads={muscleVolumeAll} />
            {muscleVolume.map((m) => (
              <View key={m.muscle} style={styles.statusRow}>
                <Text style={[styles.prName, { color: colors.paper }]} numberOfLines={1}>
                  {volumeLabel(m.muscle)}
                </Text>
                <Text
                  style={{
                    fontFamily: fonts.mono,
                    fontSize: 11,
                    marginTop: 2,
                    color: m.status === 'junk' ? colors.ember : colors.paperDim
                  }}
                >
                  {m.weeklySets} · MEV {m.mev} · MRV {m.mrv} · {volumeStatusLabel(m.status)}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
        {patternVolume.length > 0 ? (
          <View style={[styles.card, { backgroundColor: colors.panel, borderColor: colors.line }]}>
            <Text style={[styles.cardKicker, { color: colors.paperFaint }]}>{t('patternKicker')}</Text>
            <View style={styles.chipRow}>
              {patternVolume.map((p) => (
                <View
                  key={p.pattern}
                  style={[styles.chartChip, { borderColor: colors.lineStrong }]}
                >
                  <Text style={[styles.chartChipText, { color: colors.paperDim }]}>
                    {movementPatternLabel(p.pattern as MovementPattern, lang)} · {p.weeklySets}
                  </Text>
                </View>
              ))}
            </View>
            {pushPull.status !== 'none' ? (
              <Text
                style={{
                  fontFamily: fonts.mono,
                  fontSize: 11,
                  marginTop: 4,
                  color: pushPull.status === 'balanced' ? colors.lime : colors.ember
                }}
              >
                {t('patternPushPull', { push: pushPull.pushSets, pull: pushPull.pullSets })} ·{' '}
                {pushPull.status === 'balanced'
                  ? t('patternBalanceBalanced')
                  : pushPull.status === 'push_heavy'
                    ? t('patternBalancePushHeavy')
                    : t('patternBalancePullHeavy')}
              </Text>
            ) : null}
          </View>
        ) : null}
        {lastReview !== null ? (
          <View style={[styles.card, { backgroundColor: colors.panel, borderColor: colors.line }]}>
            <Text style={[styles.cardKicker, { color: colors.paperFaint }]}>{t('reviewKicker')}</Text>
            <Text style={{ color: colors.paperFaint, fontSize: 11, marginTop: 2 }}>
              {lastReview.dateKey.slice(5)} ·{' '}
              {t('reviewEffective', { eff: lastReview.effectiveSets, total: lastReview.totalSets })}
            </Text>
            {reviewLines.map((l) => (
              <View key={l.exerciseId} style={styles.statusRow}>
                <Text style={[styles.prName, { color: colors.paper }]} numberOfLines={1}>
                  {resolveStrengthName(l.exerciseId)}
                </Text>
                <Text style={{ fontFamily: fonts.mono, fontSize: 11, marginTop: 2, color: colors.paperDim }}>
                  {l.parts.map((p) => scenarioLabel(p.scenario) + ' ' + p.n).join(' · ')}
                </Text>
                <Text style={{ color: colors.paperFaint, fontSize: 11, marginTop: 2 }}>
                  {t('reviewEffective', { eff: l.effectiveSets, total: l.totalSets })}
                </Text>
              </View>
            ))}
            {lastReview.excessiveFailure ? (
              <Text style={{ color: colors.ember, fontSize: 11, marginTop: 2 }}>
                {t('reviewExcessiveFailure')}
              </Text>
            ) : null}
            {lastReview.allEasy ? (
              <Text style={{ color: colors.ember, fontSize: 11, marginTop: 2 }}>{t('reviewAllEasy')}</Text>
            ) : null}
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
    statFreeze: { fontFamily: fonts.body, fontSize: 9, marginTop: 2 },
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
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
    chartChip: {
      borderWidth: 1,
      borderRadius: radius.pill,
      paddingHorizontal: 10,
      paddingVertical: 5
    },
    chartChipText: { fontFamily: fonts.body, fontSize: 11 },
    sectionLabel: {
      fontSize: 11,
      fontFamily: fonts.mono,
      letterSpacing: 0.6,
      marginBottom: 4
    }
  });
}
