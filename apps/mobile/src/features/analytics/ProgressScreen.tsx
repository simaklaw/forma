import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { estimateBurnFromSetLogs, estimateDailyBurns, toDateKey } from '@forma/core';
import { colors, fonts, radius, spacing } from '@/core/theme/tokens';
import DailyTipCard from '@/components/DailyTipCard';
import ProfileGateBanner from '@/components/ProfileGateBanner';
import { useFitPulseStore } from '@/state/useFitPulseStore';
import { lastNDays, selectWeeklyVolume, weekdayRuShort } from '@/engines/WorkoutStats';
import WeightChart from '@/components/WeightChart';

export default function ProgressScreen() {
  const weightHistory = useFitPulseStore((s) => s.weightHistory);
  const setLogs = useFitPulseStore((s) => s.setLogs);
  const profileWeight = useFitPulseStore((s) => s.profile.weight);
  const dayProgress = useFitPulseStore((s) => s.dayProgress);

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

  const burnSeries = useMemo(() => {
    const days = lastNDays(7);
    const keys = days.map((d) => toDateKey(d));
    const burns = estimateDailyBurns({ weightKg, setLogs, dateKeys: keys });
    const max = Math.max(1, ...burns.map((b) => b.kcal));
    return burns.map((b, i) => ({
      ...b,
      label: weekdayRuShort(days[i]),
      pct: Math.round((b.kcal / max) * 100)
    }));
  }, [weightKg, setLogs]);

  const burnedToday = estimateBurnFromSetLogs({
    weightKg,
    setLogs,
    dateKey: toDateKey(new Date())
  });
  const burnedWeek = burnSeries.reduce((sum, b) => sum + b.kcal, 0);
  const hasAnyBurn = burnSeries.some((b) => b.kcal > 0);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>FITPULSE · последние 7 дней</Text>
        <Text style={styles.title}>Прогресс</Text>
      </View>

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
          <View style={[styles.statCard, { flex: 1 }]}>
            <Text style={styles.statVal}>{weekSets > 0 ? String(weekSets) : '—'}</Text>
            <Text style={styles.statLbl}>подходов за 7 дней</Text>
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  header: {
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderColor: colors.line
  },
  eyebrow: { color: colors.lime, fontSize: 11, fontFamily: fonts.bodySemi, letterSpacing: 0.8 },
  title: { color: colors.paper, fontSize: 30, fontFamily: fonts.mono, marginTop: 2 },
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
  chartTitle: { color: colors.paperDim, fontSize: 13, fontFamily: fonts.bodySemi, marginBottom: 14 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 100 },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%', gap: 4 },
  barTop: { color: colors.paperFaint, fontFamily: fonts.mono, fontSize: 9, minHeight: 12 },
  bar: { width: '100%', minHeight: 3, borderRadius: 3 },
  barLabel: { color: colors.paperFaint, fontFamily: fonts.mono, fontSize: 11 },
  emptyState: { color: colors.paperFaint, fontFamily: fonts.body, fontSize: 12.5, lineHeight: 18 }
});
