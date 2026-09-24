import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius, spacing } from '@/core/theme/tokens';
import { tipForDate } from '@/lib/dailyTips';

type Props = {
  /** Extra outer margins when parent does not pad. */
  inset?: boolean;
};

/** Offline «совет дня» — same tip as Progress (day-of-year rotation). */
export default function DailyTipCard({ inset = false }: Props) {
  const tip = useMemo(() => tipForDate(new Date()), []);

  return (
    <View style={[styles.card, inset && styles.inset]}>
      <Text style={styles.eyebrow}>FORMA · совет дня</Text>
      <Text style={styles.title}>{tip.title}</Text>
      <Text style={styles.body}>{tip.body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    backgroundColor: colors.panel,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line
  },
  inset: {
    marginHorizontal: spacing.xl,
    marginTop: spacing.lg
  },
  eyebrow: {
    color: colors.lime,
    fontSize: 10,
    fontFamily: fonts.bodySemi,
    letterSpacing: 0.8,
    marginBottom: 6
  },
  title: { color: colors.paper, fontFamily: fonts.bodySemi, fontSize: 15, marginBottom: 6 },
  body: { color: colors.paperDim, fontFamily: fonts.body, fontSize: 13, lineHeight: 19 }
});
