import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, spacing } from '@/core/theme/tokens';
import { useFitPulseStore } from '@/state/useFitPulseStore';
import { selectWeeklyVolume } from '@/engines/WorkoutStats';
import WeightChart from '@/components/WeightChart';

export default function ProgressScreen() {
  const weightHistory = useFitPulseStore((s) => s.weightHistory);
  // Real replacement for the old fixed `VOLUME` demo array (HANDOFF.md item 4)
  // — sums actual logged sets (weight × reps) per day now that all three
  // workout-screen exercises write to the store, not just exercise №1.
  const setLogs = useFitPulseStore((s) => s.setLogs);
  const volume = selectWeeklyVolume(setLogs);
  const hasAnyVolume = volume.some((v) => v.volumeKg > 0);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Последние 7 дней</Text>
        <Text style={styles.title}>Прогресс</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.chartBlock}>
          <Text style={styles.chartTitle}>Объём тренировок по дням</Text>
          {hasAnyVolume ? (
            <View style={styles.bars}>
              {volume.map((v, i) => (
                <View key={v.dateKey} style={styles.barCol}>
                  <View
                    style={[styles.bar, { height: `${Math.max(v.pct, 2)}%`, backgroundColor: i % 2 === 0 ? colors.lime : colors.lineStrong }]}
                  />
                  <Text style={styles.barLabel}>{v.label}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyState}>Пока нет записанных подходов — данные появятся после первой тренировки.</Text>
          )}
        </View>

        <View style={[styles.chartBlock, { borderBottomWidth: 0 }]}>
          <Text style={styles.chartTitle}>Динамика веса</Text>
          {weightHistory.length >= 2 ? (
            <WeightChart history={weightHistory} />
          ) : (
            <Text style={styles.emptyState}>Пока меньше двух записей веса — обновите вес в профиле, и здесь появится график.</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  header: { paddingHorizontal: spacing.xxl, paddingBottom: spacing.lg, borderBottomWidth: 1, borderColor: colors.line },
  eyebrow: { color: colors.paperFaint, fontSize: 11, fontFamily: fonts.body },
  title: { color: colors.paper, fontSize: 30, fontFamily: fonts.mono },
  body: { paddingBottom: 120 },
  chartBlock: { margin: spacing.xxl, marginBottom: 0, paddingBottom: 20, borderBottomWidth: 1, borderColor: colors.line, paddingTop: 20 },
  chartTitle: { color: colors.paperDim, fontSize: 13, fontFamily: fonts.bodySemi, marginBottom: 14 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 90 },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%', gap: 6 },
  bar: { width: '100%', minHeight: 3 },
  barLabel: { color: colors.paperFaint, fontFamily: fonts.mono, fontSize: 11 },
  emptyState: { color: colors.paperFaint, fontFamily: fonts.body, fontSize: 12.5, lineHeight: 18 }
});
