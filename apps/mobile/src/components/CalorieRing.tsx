/**
 * CalorieRing — SVG ring matching FitPulse nutrition hero.
 * Skia upgrade is optional later; API stays the same.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors, fonts } from '@/core/theme/tokens';

interface Props {
  eaten: number;
  target: number;
  size?: number;
}

export default function CalorieRing({ eaten, target, size = 108 }: Props) {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(100, Math.round((eaten / Math.max(1, target)) * 100));
  const dashOffset = circumference - (circumference * pct) / 100;

  return (
    <View style={{ width: size, height: size }}>
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
          stroke={colors.lime}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={StyleSheet.absoluteFillObject}>
        <View style={styles.center}>
          <Text style={styles.value}>{eaten.toLocaleString('ru-RU')}</Text>
          <Text style={styles.label}>ккал</Text>
          <Text style={styles.sub}>из {target.toLocaleString('ru-RU')}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  value: { color: colors.paper, fontSize: 26, fontFamily: fonts.mono, lineHeight: 28 },
  label: { color: colors.paperDim, fontSize: 11, fontFamily: fonts.body, marginTop: 2 },
  sub: { color: colors.paperFaint, fontSize: 10, fontFamily: fonts.body, marginTop: 1 }
});
