/**
 * CalorieRing — SVG ring for nutrition hero.
 * Budget = dietary target + optional workout burn.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { fonts, type ColorTokens } from '@/core/theme/tokens';
import { useThemeColors } from '@/core/theme/useThemeColors';

interface Props {
  eaten: number;
  target: number;
  /** Active calories from training — expands the daily budget. */
  burned?: number;
  size?: number;
  /** When false, ring is muted and center shows setup hint */
  ready?: boolean;
}

export default function CalorieRing({
  eaten,
  target,
  burned = 0,
  size = 120,
  ready = true
}: Props) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const strokeWidth = 9;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const budget = Math.max(1, Math.round(target + Math.max(0, burned)));
  const eatenSafe = Math.max(0, Math.round(eaten));
  const pct = ready ? Math.min(100, Math.round((eatenSafe / budget) * 100)) : 0;
  const dashOffset = circumference - (circumference * pct) / 100;
  const remaining = budget - eatenSafe;
  const over = ready && remaining < 0;
  const stroke = !ready ? colors.lineStrong : over ? colors.ember : colors.lime;

  const a11y = !ready
    ? 'Цель калорий недоступна — заполните профиль'
    : over
      ? `Съедено ${eatenSafe} килокалорий, сверх бюджета на ${Math.abs(remaining)}`
      : `Съедено ${eatenSafe} из ${budget} килокалорий, осталось ${remaining}, ${pct} процентов`;

  return (
    <View
      style={{ width: size, height: size }}
      accessible
      accessibilityRole="progressbar"
      accessibilityValue={ready ? { min: 0, max: 100, now: pct } : undefined}
      accessibilityLabel={a11y}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.lineStrong}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={stroke}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <View style={styles.center}>
          {!ready ? (
            <>
              <Text style={styles.valueMuted}>—</Text>
              <Text style={styles.label}>цель</Text>
              <Text style={styles.sub}>профиль</Text>
            </>
          ) : (
            <>
              <Text style={[styles.value, over && styles.valueOver]}>
                {eatenSafe.toLocaleString('ru-RU')}
              </Text>
              <Text style={styles.label}>ккал</Text>
              <Text style={[styles.sub, over && styles.subOver]}>
                {over
                  ? `+${Math.abs(remaining).toLocaleString('ru-RU')}`
                  : `${pct}% · ещё ${remaining.toLocaleString('ru-RU')}`}
              </Text>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
    value: { color: colors.paper, fontSize: 28, fontFamily: fonts.mono, lineHeight: 30 },
    valueMuted: { color: colors.paperFaint, fontSize: 28, fontFamily: fonts.mono, lineHeight: 30 },
    valueOver: { color: colors.ember },
    label: {
      color: colors.paperDim,
      fontSize: 11,
      fontFamily: fonts.bodySemi,
      marginTop: 2,
      letterSpacing: 0.4
    },
    sub: {
      color: colors.paperFaint,
      fontSize: 10,
      fontFamily: fonts.mono,
      marginTop: 2,
      textAlign: 'center'
    },
    subOver: { color: colors.ember }
  });
}
