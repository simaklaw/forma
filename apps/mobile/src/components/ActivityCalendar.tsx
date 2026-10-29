import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Md3Card from './md3/Md3Card';
import { fonts, radius, spacing, type ColorTokens } from '@/core/theme/tokens';
import { useThemeColors } from '@/core/theme/useThemeColors';
import { useT } from '@/i18n/strings';
import { useLanguageStore } from '@/i18n/useLanguageStore';
import { selectMonthActivity, type DayActivity } from '@/engines/WorkoutStats';
import type { DayMeals } from '@/state/useFitPulseStore';

/** 2023-01-02 — понедельник; опорная неделя для коротких имён дней под локаль. */
const MONDAY_BASE_DAY = 2;

/** Короткие дни недели под локаль, с понедельника: «Пн…Вс» / «Mo…Su». */
function weekdayShortLabels(locale: string): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const raw = new Date(2023, 0, MONDAY_BASE_DAY + i).toLocaleDateString(locale, {
      weekday: 'short'
    });
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  });
}

/** Название месяца под локаль, с заглавной буквы: «Октябрь» / «October». */
function monthLabel(year: number, month: number, locale: string): string {
  const raw = new Date(year, month, 1).toLocaleDateString(locale, { month: 'long' });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

interface Props {
  setLogs: { dateKey: string }[];
  allMeals: DayMeals;
  /** Замороженные дни серии (streak freeze) — рисуются «льдом». */
  frozenDates?: readonly string[];
}

/** Monday-first leading blanks count for a given year/month. */
function leadingBlanks(year: number, month: number): number {
  const jsDay = new Date(year, month, 1).getDay(); // 0 = Sunday
  return jsDay === 0 ? 6 : jsDay - 1;
}

export default function ActivityCalendar({ setLogs, allMeals, frozenDates = [] }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const t = useT();
  const lang = useLanguageStore((s) => s.lang);
  const locale = lang === 'en' ? 'en-US' : 'ru-RU';
  const weekdays = useMemo(() => weekdayShortLabels(locale), [locale]);

  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const days = useMemo(
    () => selectMonthActivity(setLogs, allMeals, cursor.year, cursor.month, frozenDates),
    [setLogs, allMeals, cursor, frozenDates]
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
    // Замороженный день — «ледяной» голубой (макро-токен углеводов).
    if (level === 'frozen') return colors.macroCarb;
    return colors.line;
  }

  return (
    <Md3Card variant="flat" padding="md" style={styles.card}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => shiftMonth(-1)}
          accessibilityRole="button"
          accessibilityLabel={t('calPrevMonth')}
          hitSlop={8}
        >
          <Text style={[styles.navArrow, { color: colors.paperDim }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.monthLabel, { color: colors.paper }]}>
          {monthLabel(cursor.year, cursor.month, locale)} {cursor.year}
        </Text>
        <TouchableOpacity
          onPress={() => shiftMonth(1)}
          accessibilityRole="button"
          accessibilityLabel={t('calNextMonth')}
          hitSlop={8}
        >
          <Text style={[styles.navArrow, { color: colors.paperDim }]}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.weekHeadRow}>
        {weekdays.map((w) => (
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
          <Text style={[styles.legendText, { color: colors.paperFaint }]}>{t('calLegendFull')}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.cyan }]} />
          <Text style={[styles.legendText, { color: colors.paperFaint }]}>{t('calLegendLight')}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.macroCarb }]} />
          <Text style={[styles.legendText, { color: colors.paperFaint }]}>{t('calLegendFrozen')}</Text>
        </View>
      </View>
    </Md3Card>
  );
}

function createStyles(_colors: ColorTokens) {
  return StyleSheet.create({
    card: { borderRadius: radius.card, marginBottom: spacing.md },
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
    legend: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      columnGap: 16,
      rowGap: 4,
      marginTop: spacing.sm
    },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { fontFamily: fonts.body, fontSize: 10 }
  });
}
