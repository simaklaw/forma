import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { fonts, radius, spacing, type ColorTokens } from '@/core/theme/tokens';
import { useThemeColors } from '@/core/theme/useThemeColors';
import { selectMonthActivity, type DayActivity } from '@/engines/WorkoutStats';
import type { DayMeals } from '@/state/useFitPulseStore';

const MONTH_NAMES_RU = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь'
];
const WEEKDAY_HEAD_RU = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

interface Props {
  setLogs: { dateKey: string }[];
  allMeals: DayMeals;
}

/** Monday-first leading blanks count for a given year/month. */
function leadingBlanks(year: number, month: number): number {
  const jsDay = new Date(year, month, 1).getDay(); // 0 = Sunday
  return jsDay === 0 ? 6 : jsDay - 1;
}

export default function ActivityCalendar({ setLogs, allMeals }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const days = useMemo(
    () => selectMonthActivity(setLogs, allMeals, cursor.year, cursor.month),
    [setLogs, allMeals, cursor]
  );
  const blanks = leadingBlanks(cursor.year, cursor.month);

  function shiftMonth(delta: number) {
    setCursor((c) => {
      const d = new Date(c.year, c.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }

  function dotColor(level: DayActivity['level']): string {
    if (level === 'full') return colors.lime;
    if (level === 'light') return colors.cyan;
    return colors.line;
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.panel, borderColor: colors.line }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => shiftMonth(-1)}
          accessibilityRole="button"
          accessibilityLabel="Предыдущий месяц"
          hitSlop={8}
        >
          <Text style={[styles.navArrow, { color: colors.paperDim }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.monthLabel, { color: colors.paper }]}>
          {MONTH_NAMES_RU[cursor.month]} {cursor.year}
        </Text>
        <TouchableOpacity
          onPress={() => shiftMonth(1)}
          accessibilityRole="button"
          accessibilityLabel="Следующий месяц"
          hitSlop={8}
        >
          <Text style={[styles.navArrow, { color: colors.paperDim }]}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.weekHeadRow}>
        {WEEKDAY_HEAD_RU.map((w) => (
          <Text key={w} style={[styles.weekHeadCell, { color: colors.paperFaint }]}>
            {w}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {Array.from({ length: blanks }).map((_, i) => (
          <View key={`blank-${i}`} style={styles.cell} />
        ))}
        {days.map((d) => (
          <View key={d.dateKey} style={styles.cell}>
            <View
              style={[
                styles.dot,
                {
                  backgroundColor: d.isFuture ? 'transparent' : dotColor(d.level),
                  borderColor: d.isToday ? colors.lime : 'transparent',
                  borderWidth: d.isToday ? 1.5 : 0
                }
              ]}
            >
              <Text
                style={[
                  styles.dayNum,
                  { color: d.level === 'none' || d.isFuture ? colors.paperFaint : colors.ink }
                ]}
              >
                {d.dayOfMonth}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.lime }]} />
          <Text style={[styles.legendText, { color: colors.paperFaint }]}>
            Тренировка + питание
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.cyan }]} />
          <Text style={[styles.legendText, { color: colors.paperFaint }]}>Одно из двух</Text>
        </View>
      </View>
    </View>
  );
}

function createStyles(_colors: ColorTokens) {
  return StyleSheet.create({
    card: {
      borderWidth: 1,
      borderRadius: radius.card,
      padding: spacing.md,
      marginBottom: spacing.md
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.sm
    },
    navArrow: { fontFamily: fonts.mono, fontSize: 22, paddingHorizontal: 12 },
    monthLabel: { fontFamily: fonts.bodySemi, fontSize: 14 },
    weekHeadRow: { flexDirection: 'row', marginBottom: 4 },
    weekHeadCell: {
      flex: 1,
      textAlign: 'center',
      fontFamily: fonts.body,
      fontSize: 10
    },
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    cell: {
      width: '14.285%',
      aspectRatio: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 2
    },
    dot: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center'
    },
    dayNum: { fontFamily: fonts.mono, fontSize: 11 },
    legend: { flexDirection: 'row', gap: 16, marginTop: spacing.sm },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { fontFamily: fonts.body, fontSize: 10 }
  });
}
