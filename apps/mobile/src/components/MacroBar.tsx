import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { fonts, radius, type ColorTokens } from '@/core/theme/tokens';
import { useThemeColors } from '@/core/theme/useThemeColors';

interface Props {
  label: string;
  value: number;
  target: number;
  color: string;
}

export default function MacroBar({ label, value, target, color }: Props) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const valueR = Math.max(0, Math.round(value));
  const targetR = Math.max(0, Math.round(target));
  const safeTarget = Math.max(1, targetR);
  const pct = Math.min(100, Math.round((valueR / safeTarget) * 100));
  const remaining = targetR - valueR;
  const over = remaining < 0;

  const a11y =
    targetR <= 0
      ? `${label}: ${valueR} г, цель не задана`
      : over
        ? `${label}: ${valueR} из ${targetR} г, сверх на ${Math.abs(remaining)} г`
        : `${label}: ${valueR} из ${targetR} г, осталось ${remaining} г`;

  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={a11y}
      accessibilityValue={targetR > 0 ? { min: 0, max: 100, now: pct } : undefined}
    >
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.tag} numberOfLines={1}>
        {label}
      </Text>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${pct}%`, backgroundColor: over ? colors.ember : color }
          ]}
        />
      </View>
      <View style={styles.nums}>
        <Text style={[styles.val, over && styles.valOver]}>
          {valueR}/{targetR}
        </Text>
        <Text style={[styles.unit, over && styles.valOver]}>г</Text>
      </View>
    </View>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 11 },
    dot: { width: 8, height: 8, borderRadius: radius.pill },
    tag: {
      width: 52,
      color: colors.paperDim,
      fontFamily: fonts.bodySemi,
      fontSize: 12
    },
    track: {
      flex: 1,
      height: 7,
      backgroundColor: colors.lineStrong,
      borderRadius: radius.pill,
      overflow: 'hidden'
    },
    fill: { height: '100%', borderRadius: radius.pill },
    nums: { flexDirection: 'row', alignItems: 'baseline', minWidth: 56, justifyContent: 'flex-end' },
    val: {
      color: colors.paperDim,
      fontFamily: fonts.mono,
      fontSize: 13
    },
    unit: {
      color: colors.paperFaint,
      fontFamily: fonts.body,
      fontSize: 11,
      marginLeft: 2
    },
    valOver: { color: colors.ember }
  });
}
