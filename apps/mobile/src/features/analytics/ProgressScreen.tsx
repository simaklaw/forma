import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { estimateBurnFromSetLogs, estimateDailyBurns, toDateKey } from '@forma/core';
import { fonts, radius, spacing, type ColorTokens } from '@/core/theme/tokens';
import { useThemeColors } from '@/core/theme/useThemeColors';
import DailyTipCard from '@/components/DailyTipCard';
import ProfileGateBanner from '@/components/ProfileGateBanner';
import ScreenHeader from '@/components/ScreenHeader';
import { useFitPulseStore } from '@/state/useFitPulseStore';
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

export default function ProgressScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const weightHistory = useFitPulseStore((s) => s.weightHistory);
  const setLogs = useFitPulseStore((s) => s.setLogs);
  const profileWeight = useFitPulseStore((s) => s.profile.weight);
  const dayProgress = useFitPulseStore((s) => s.dayProgress);
  const personalRecords = useFitPulseStore((s) => s.personalRecords);

  const exerciseNames = useMemo(() => allExerciseNames(), []);

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
      pct: Math.round((b.kcal / max) * 100)
    }));
  }, [weightKg, setLogs, exerciseNames]);

  const burnedToday = estimateBurnFromSetLogs({
    weightKg,
    setLogs,
    dateKey: toDateKey(new Date()),
    exerciseNames
  });
  const burnedWeek = burnSeries.reduce((sum, b) => sum + b.kcal, 0);
  const hasAnyBurn = burnSeries.some((b) => b.kcal > 0);
  const weekVolumeKg = volume.reduce((s, v) => s + v.volumeKg, 0);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScreenHeader eyebrow="Последние 7 дней" title="Прогресс" />

      <ScrollView contentContainerStyle={styles.body}>
        {weightKg <= 0 ? (
          <ProfileGateBanner
            inset
            title="Нужен вес в профиле"
            body="Оценка сожжённых ккал (MET) считается от массы тела. Укажите вес в «Профиль» — без default 70 кг."
          />
        ) : null}

        <DailyTipCard inset />

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statVal}>{burnedToday > 0 ? `~${burnedToday}` : '—'}</Text>
            <Text style={styles.statLbl}>ккал сегодня</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statVal}>{burnedWeek > 0 ? `~${burnedWeek}` : '—'}</Text>
            <Text style={styles.statLbl}>ккал за 7 дней</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statVal}>{weightKg > 0 ? String(weightKg) : '—'}</Text>
            <Text style={styles.statLbl}>вес, кг</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statVal}>{weekSets > 0 ? String(weekSets) : '—'}</Text>
            <Text style={styles.statLbl}>подходов</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statVal}>{activeDays > 0 ? String(activeDays) : '—'}</Text>
            <Text style={styles.statLbl}>дней с треней</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statVal}>{streak > 0 ? String(streak) : '—'}</Text>
            <Text style={styles.statLbl}>
              серия{streak > 0 ? ` · ${ruDayWord(streak)}` : ''}
            </Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { flex: 1 }]}>
            <Text style={styles.statVal}>
              {weekVolumeKg > 0 ? Math.round(weekVolumeKg).toLocaleString('ru-RU') : '—'}
            </Text>
            <Text style={styles.statLbl}>объём кг·повт за 7 дней</Text>
          </View>
          <View style={[styles.statCard, { flex: 1 }]}>
            <Text style={styles.statVal}>{bestPr != null ? `${bestPr}` : '—'}</Text>
            <Text style={styles.statLbl}>лучший PR, кг</Text>
          </View>
        </View>

        <View style={styles.chartBlock}>
          <Text style={styles.chartTitle}>Сожжено по дням (оценка MET)</Text>
          {hasAnyBurn ? (
            <View style={styles.bars}>
              {burnSeries.map((v, i) => (
                <View key={v.dateKey} style={styles.barCol}>
                  <Text style={styles.barTop}>{v.kcal > 0 ? v.kcal : ''}</Text>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: `${Math.max(v.pct, 2)}%`,
                        backgroundColor: i % 2 === 0 ? colors.lime : colors.mint
                      }
                    ]}
                  />
                  <Text style={styles.barLabel}>{v.label}</Text>
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
            <View style={styles.bars}>
              {volume.map((v, i) => (
                <View key={v.dateKey} style={styles.barCol}>
                  <Text style={styles.barTop}>
                    {v.volumeKg > 0 ? Math.round(v.volumeKg) : ''}
                  </Text>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: `${Math.max(v.pct, 2)}%`,
                        backgroundColor: i % 2 === 0 ? colors.lime : colors.lineStrong
                      }
                    ]}
                  />
                  <Text style={styles.barLabel}>{v.label}</Text>
                </View>
              ))}
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
              <View key={r.exerciseId} style={styles.prRow}>
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
    barLabel: { color: colors.paperFaint, fontFamily: fonts.mono, fontSize: 11 },
    emptyState: { color: colors.paperFaint, fontFamily: fonts.body, fontSize: 12.5, lineHeight: 18 },
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
