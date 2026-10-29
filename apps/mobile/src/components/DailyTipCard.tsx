import React, { useMemo } from 'react';
import { StyleSheet, Text } from 'react-native';
import { spacing, typeScale, type ColorTokens } from '@/core/theme/tokens';
import { useThemeColors } from '@/core/theme/useThemeColors';
import { tipForDate } from '@/lib/dailyTips';
import Md3Card from './md3/Md3Card';

type Props = {
  /** Extra outer margins when parent does not pad. */
  inset?: boolean;
};

/** Offline «совет дня» — same tip as Progress (day-of-year rotation). */
export default function DailyTipCard({ inset = false }: Props) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const tip = useMemo(() => tipForDate(new Date()), []);

  return (
    <Md3Card variant="flat" padding="lg" style={inset ? styles.inset : null}>
      <Text style={styles.eyebrow}>FITPULSE · совет дня</Text>
      <Text style={styles.title}>{tip.title}</Text>
      <Text style={styles.body}>{tip.body}</Text>
    </Md3Card>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    inset: {
      marginHorizontal: spacing.xl,
      marginTop: spacing.lg
    },
    eyebrow: { ...typeScale.labelMedium, color: colors.lime, marginBottom: 6 },
    title: { ...typeScale.titleMedium, color: colors.paper, marginBottom: 6 },
    body: { ...typeScale.bodyMedium, color: colors.paperDim }
  });
}
