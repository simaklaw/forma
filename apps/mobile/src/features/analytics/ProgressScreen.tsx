import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  analyzeRecovery,
  estimateBurnFromSetLogs,
  estimateDailyBurns,
  evaluateAchievements,
  isProfileComplete,
  toDateKey,
  type AchievementWorkout
} from '@forma/core';
import { fonts, radius, spacing, type ColorTokens } from '@/core/theme/tokens';
import { useThemeColors } from '@/core/theme/useThemeColors';
import DailyTipCard from '@/components/DailyTipCard';
import ProfileGateBanner from '@/components/ProfileGateBanner';
import ScreenHeader from '@/components/ScreenHeader';
import { selectDailyTotals, useFitPulseStore } from '@/state/useFitPulseStore';
import {
  lastNDays,
  ruDayWord,
  selectOverallPersonalRecord,
  selectWeeklyVolume,
  weekdayRuShort
} from '@/engines/WorkoutStats';
import { allExerciseNames } from '@/features/workout/catalog';
import WeightChart from '@/components/WeightChart';

/** Consecutive days (ending today or yesterday) with ≥1 logged set. */
function activityStreakDays(
  setLogs: { dateKey: string }[],
  now: Date = new Date()
): number {
  const active = new Set(setLogs.map((e) => e.dateKey));
  const cursor = new Date(now);
  let key = toDateKey(cursor);
  if (!active.has(key)) {
    cursor.setDate(cursor.getDate() - 1);
    key = toDateKey(cursor);
  }
  let streak = 0;
  while (active.has(toDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

const GLASS_ML = 250;

function workoutsFromSetLogs(setLogs: { dateKey: string }[]): AchievementWorkout[] {
  const dates = [...new Set(setLogs.map((e) => e.dateKey))].sort();
  return dates.map((date) => ({ date, completed: true }));
}

function buildSubtitle(opts: {
  weightKg: number;
  activeDays: number;
  streak: number;
  burnedWeek: number;
  weekSets: number;
}): string {
  const { weightKg, activeDays, streak, burnedWeek, weekSets } = opts;
  if (weightKg <= 0 && weekSets === 0) {
    return 'Заполните вес и залогируйте подходы';
  }
  const parts: string[] = [];
  if (activeDays > 0) parts.push(`${activeDays} ${ruDayWord(activeDays)} с треней`);
  if (streak > 0) parts.push(`серия ${streak}`);
  if (burnedWeek > 0) parts.push(`~${burnedWeek} ккал`);
  if (parts.length === 0) return 'Нет данных за 7 дней — после первой тренировки';
  return parts.join(' · ');
}

export default function ProgressScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const weightHistory = useFitPulseStore((s) => s.weightHistory);
  const waterGlasses = useFitPulseStore((s) => s.waterGlasses);
  const todayMeals = useFitPulseStore((s) => s.todayMeals);
  const profile = useFitPulseStore((s) => s.profile);

  const setLogs = useFitPulseStore((s) => s.setLogs);
  const profileWeight = useFitPulseStore((s) => s.profile.weight);
  const dayProgress = useFitPulseStore((s) => s.dayProgress);
  const personalRecords = useFitPulseStore((s) => s.personalRecords);
  const calcTargets = useFitPulseStore((s) => s.calculateTargets);

  const exerciseNames = useMemo(() => allExerciseNames(), []);
  const todayKey = useMemo(() => toDateKey(new Date()), []);

  const weightKg =
    typeof profileWeight === 'number' && Number.isFinite(profileWeight) && profileWeight > 0
      ? profileWeight
      : 0;

  const volume = selectWeeklyVolume(setLogs);
  const hasAnyVolume = volume.some((v) => v.volumeKg > 0);

  const weekKeys = useMemo(() => lastNDays(7).map((d) => toDateKey(d)), []);
  const weekSets = useMemo(() => {
    let n = 0;
    for (const key of weekKeys) {
      const day = dayProgress[key];
      if (!day) continue;
      for (const count of Object.values(day)) n += count;
    }
    return n;
  }, [dayProgress, weekKeys]);

  const activeDays = useMemo(() => {
    let n = 0;
    for (const key of weekKeys) {
      if (setLogs.some((e) => e.dateKey === key)) n += 1;
    }
    return n;
  }, [setLogs, weekKeys]);

  const streak = useMemo(() => activityStreakDays(setLogs), [setLogs]);

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
    [profileComplete, calcTargets, profile]
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
    const keys = days.map((d) => toDateKey(d));
    const burns = estimateDailyBurns({
      weightKg,
      setLogs,
      dateKeys: keys,
      exerciseNames
    });
    const max = Math.max(1, ...burns.map((b) => b.kcal));
    return burns.map((b, i) => ({
      ...b,
      label: weekdayRuShort(days[i]),
      pct: Math.round((b.kcal / max) * 100),
      isToday: keys[i] === todayKey
    }));
  }, [weightKg, setLogs, exerciseNames, todayKey]);

  const burnedToday = estimateBurnFromSetLogs({
    weightKg,
    setLogs,
    dateKey: todayKey,
    exerciseNames
  });
  const burnedWeek = burnSeries.reduce((sum, b) => sum + b.kcal, 0);
  const hasAnyBurn = burnSeries.some((b) => b.kcal > 0);
  const weekVolumeKg = volume.reduce((s, v) => s + v.volumeKg, 0);

  const subtitle = buildSubtitle({
    weightKg,
    activeDays,
    streak,
    burnedWeek,
    weekSets
  });

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScreenHeader eyebrow="Последние 7 дней" title="Прогресс" subtitle={subtitle} />

      <ScrollView contentContainerStyle={styles.body}>
        {weightKg <= 0 ? (
          <ProfileGateBanner
            inset
            title="Нужен вес в профиле"
            body="Оценка сожжённых ккал (MET) считается от массы тела. Укажите вес в «Профиль» — без default 70 кг."
          />
        ) : null}

        <DailyTipCard inset />

        <View style={styles.chartBlock} accessibilityRole="summary">
          <Text style={styles.chartTitle}>Восстановление</Text>
          <Text style={styles.recoveryScore}>{recovery.recoveryScore}%</Text>
          <Text style={styles.recoveryStatus}>{recovery.statusLabel}</Text>
          <View style={styles.pillarRow}>
            <Text style={styles.pillar}>Мышцы {recovery.muscularReadiness}</Text>
            <Text style={styles.pillar}>Энергия {recovery.energyRestoration}</Text>
            <Text style={styles.pillar}>ЦНС {recovery.cnsFreshness}</Text>
            <Text style={styles.pillar}>Вода {recovery.hydrationScore}</Text>
          </View>
          <Text style={styles.recoveryRec}>{recovery.recommendationTitle}</Text>
          <Text style={styles.emptyState}>{recovery.recommendationDescription}</Text>
          {recovery.nutritionAdvice ? (
            <Text style={[styles.emptyState, { marginTop: 6 }]}>{recovery.nutritionAdvice}</Text>
          ) : null}
        </View>

        <View style={styles.chartBlock}>
          <Text style={styles.chartTitle}>Достижения</Text>
          <View style={styles.badgeGrid}>
            {badges.map((b) => (
              <View
                key={b.id}
                style={[styles.badge, b.unlocked ? styles.badgeOn : styles.badgeOff]}
              >
                <Text style={styles.badgeTitle}>{b.title}</Text>
                <Text style={styles.badgeHint}>{b.unlocked ? '✓' : b.hint}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.statsRow}>
          <View
            style={styles.statCard}
            accessibilityRole="summary"
            accessibilityLabel={`Ккал сегодня: ${burnedToday > 0 ? burnedToday : 'нет данных'}`}
          >
            <Text style={styles.statVal}>{burnedToday > 0 ? `~${burnedToday}` : '—'}</Text>
            <Text style={styles.statLbl}>ккал сегодня</Text>
          </View>
          <View
            style={styles.statCard}
            accessibilityRole="summary"
            accessibilityLabel={`Ккал за 7 дней: ${burnedWeek > 0 ? burnedWeek : 'нет данных'}`}
          >
            <Text style={styles.statVal}>{burnedWeek > 0 ? `~${burnedWeek}` : '—'}</Text>
            <Text style={styles.statLbl}>ккал за 7 дней</Text>
          </View>
          <View
            style={styles.statCard}
            accessibilityRole="summary"
            accessibilityLabel={`Вес: ${weightKg > 0 ? `${weightKg} килограмм` : 'не указан'}`}
          >
            <Text style={styles.statVal}>{weightKg > 0 ? String(weightKg) : '—'}</Text>
            <Text style={styles.statLbl}>вес, кг</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View
            style={styles.statCard}
            accessibilityRole="summary"
            accessibilityLabel={`Подходов за неделю: ${weekSets}`}
          >
            <Text style={styles.statVal}>{weekSets > 0 ? String(weekSets) : '—'}</Text>
            <Text style={styles.statLbl}>подходов</Text>
          </View>
          <View
            style={styles.statCard}
            accessibilityRole="summary"
            accessibilityLabel={`Дней с тренировкой: ${activeDays}`}
          >
            <Text style={styles.statVal}>{activeDays > 0 ? String(activeDays) : '—'}</Text>
            <Text style={styles.statLbl}>дней с треней</Text>
          </View>
          <View
            style={styles.statCard}
            accessibilityRole="summary"
            accessibilityLabel={streak > 0 ? `Серия ${streak} ${ruDayWord(streak)}` : 'Серии нет'}
          >
            <Text style={styles.statVal}>{streak > 0 ? String(streak) : '—'}</Text>
            <Text style={styles.statLbl}>
              серия{streak > 0 ? ` · ${ruDayWord(streak)}` : ''}
            </Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View
            style={[styles.statCard, { flex: 1 }]}
            accessibilityRole="summary"
            accessibilityLabel={
              weekVolumeKg > 0
                ? `Объём за 7 дней ${Math.round(weekVolumeKg)} килограмм-повторений`
                : 'Объём не записан'
            }
          >
            <Text style={styles.statVal}>
              {weekVolumeKg > 0 ? Math.round(weekVolumeKg).toLocaleString('ru-RU') : '—'}
            </Text>
            <Text style={styles.statLbl}>объём кг·повт за 7 дней</Text>
          </View>
          <View
            style={[styles.statCard, { flex: 1 }]}
            accessibilityRole="summary"
            accessibilityLabel={bestPr != null ? `Лучший PR ${bestPr} кг` : 'PR пока нет'}
          >
            <Text style={styles.statVal}>{bestPr != null ? `${bestPr}` : '—'}</Text>
            <Text style={styles.statLbl}>лучший PR, кг</Text>
          </View>
        </View>

        <View style={styles.chartBlock}>
          <Text style={styles.chartTitle}>Сожжено по дням (оценка MET)</Text>
          {hasAnyBurn ? (
            <View style={styles.bars} accessibilityRole="image" accessibilityLabel="График ккал по дням">
              {burnSeries.map((v, i) => (
                <View key={v.dateKey} style={styles.barCol}>
                  <Text style={styles.barTop}>{v.kcal > 0 ? v.kcal : ''}</Text>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: `${Math.max(v.pct, 2)}%`,
                        backgroundColor: v.isToday
                          ? colors.lime
                          : i % 2 === 0
                            ? colors.mint
                            : colors.lineStrong
                      },
                      v.isToday && styles.barToday
                    ]}
                  />
                  <Text style={[styles.barLabel, v.isToday && styles.barLabelToday]}>{v.label}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyState}>
              {weightKg <= 0
                ? 'Укажите вес в профиле и залогируйте подходы — появится оценка ккал.'
                : 'Пока нет подходов — оценка калорий появится после первой тренировки.'}
            </Text>
          )}
        </View>

        <View style={styles.chartBlock}>
          <Text style={styles.chartTitle}>Объём тренировок по дням</Text>
          {hasAnyVolume ? (
            <View
              style={styles.bars}
              accessibilityRole="image"
              accessibilityLabel="График объёма по дням"
            >
              {volume.map((v, i) => {
                const isToday = v.dateKey === todayKey;
                return (
                  <View key={v.dateKey} style={styles.barCol}>
                    <Text style={styles.barTop}>
                      {v.volumeKg > 0 ? Math.round(v.volumeKg) : ''}
                    </Text>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: `${Math.max(v.pct, 2)}%`,
                          backgroundColor: isToday
                            ? colors.lime
                            : i % 2 === 0
                              ? colors.mint
                              : colors.lineStrong
                        },
                        isToday && styles.barToday
                      ]}
                    />
                    <Text style={[styles.barLabel, isToday && styles.barLabelToday]}>{v.label}</Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={styles.emptyState}>
              Пока нет записанных подходов — данные появятся после первой тренировки.
            </Text>
          )}
        </View>

        {topPrs.length > 0 ? (
          <View style={styles.chartBlock}>
            <Text style={styles.chartTitle}>Личные рекорды (топ по весу)</Text>
            {topPrs.map((r, i) => (
              <View
                key={r.exerciseId}
                style={styles.prRow}
                accessibilityLabel={`${i + 1}. ${r.name}, ${r.weight} килограмм`}
              >
                <Text style={styles.prRank}>{String(i + 1).padStart(2, '0')}</Text>
                <Text style={styles.prName} numberOfLines={1}>
                  {r.name}
                </Text>
                <Text style={styles.prWeight}>{r.weight} кг</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.chartBlock}>
          <Text style={styles.chartTitle}>Динамика веса</Text>
          {weightHistory.length >= 2 ? (
            <WeightChart history={weightHistory} />
          ) : (
            <Text style={styles.emptyState}>
              Нужны минимум две записи веса в профиле — тогда появится линия.
            </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.ink },
    body: { paddingBottom: 120 },
    statsRow: {
      flexDirection: 'row',
      gap: 10,
      marginHorizontal: spacing.xl,
      marginTop: spacing.lg
    },
    statCard: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.panel,
      borderRadius: radius.card,
      padding: 14
    },
    statVal: { color: colors.paper, fontSize: 20, fontFamily: fonts.mono },
    statLbl: { color: colors.paperFaint, fontSize: 11, marginTop: 4, fontFamily: fonts.body },
    chartBlock: {
      marginHorizontal: spacing.xl,
      marginTop: spacing.md,
      padding: spacing.lg,
      backgroundColor: colors.panel,
      borderRadius: radius.card,
      borderWidth: 1,
      borderColor: colors.line
    },
    chartTitle: {
      color: colors.paperDim,
      fontSize: 13,
      fontFamily: fonts.bodySemi,
      marginBottom: 14
    },
    bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 100 },
    barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%', gap: 4 },
    barTop: { color: colors.paperFaint, fontFamily: fonts.mono, fontSize: 9, minHeight: 12 },
    bar: { width: '100%', minHeight: 3, borderRadius: 3 },
    barToday: { borderWidth: 1, borderColor: colors.lime },
    barLabel: { color: colors.paperFaint, fontFamily: fonts.mono, fontSize: 11 },
    barLabelToday: { color: colors.lime, fontFamily: fonts.bodySemi },
    emptyState: { color: colors.paperFaint, fontFamily: fonts.body, fontSize: 12.5, lineHeight: 18 },
    recoveryScore: {
      color: colors.paper,
      fontSize: 36,
      fontFamily: fonts.mono,
      marginTop: 4
    },
    recoveryStatus: {
      color: colors.lime,
      fontSize: 14,
      fontFamily: fonts.bodySemi,
      marginTop: 2
    },
    pillarRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 10
    },
    pillar: {
      color: colors.paperDim,
      fontSize: 12,
      fontFamily: fonts.mono
    },
    recoveryRec: {
      color: colors.paper,
      fontSize: 14,
      fontFamily: fonts.bodySemi,
      marginTop: 12
    },
    badgeGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8
    },
    badge: {
      width: '47%',
      borderWidth: 1,
      borderRadius: radius.card,
      padding: 10
    },
    badgeOn: {
      borderColor: colors.lime,
      backgroundColor: colors.panel
    },
    badgeOff: {
      borderColor: colors.line,
      backgroundColor: colors.ink,
      opacity: 0.75
    },
    badgeTitle: {
      color: colors.paper,
      fontSize: 13,
      fontFamily: fonts.bodySemi
    },
    badgeHint: {
      color: colors.paperFaint,
      fontSize: 11,
      fontFamily: fonts.body,
      marginTop: 4
    },
    prRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.line
    },
    prRank: { color: colors.lime, fontFamily: fonts.mono, fontSize: 13, width: 28 },
    prName: { flex: 1, color: colors.paper, fontFamily: fonts.body, fontSize: 14 },
    prWeight: { color: colors.paperDim, fontFamily: fonts.mono, fontSize: 14 }
  });
}
