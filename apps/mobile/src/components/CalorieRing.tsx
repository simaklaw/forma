/**
 * CalorieRing.tsx
 *
 * The report specifies React Native Skia for 120Hz hardware-accelerated
 * chart rendering. This scaffold uses react-native-svg instead — it needs no
 * extra Expo config-plugin setup and renders identically to the HTML
 * prototype's SVG ring, so it's a safe default a developer can upgrade to
 * Skia later purely as a performance pass (see HANDOFF.md) without changing
 * the visual result or the component's public API.
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

export default function CalorieRing({ eaten, target, size = 92 }: Props) {
  const strokeWidth = 6;
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
          stroke={colors.cyan}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="square"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={StyleSheet.absoluteFillObject}>
        <View style={styles.center}>
          <Text style={styles.value}>{eaten.toLocaleString('ru-RU')}</Text>
          <Text style={styles.label}>из {target.toLocaleString('ru-RU')} ккал</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  value: { color: colors.paper, fontSize: 22, fontFamily: fonts.mono },
  label: { color: colors.paperFaint, fontSize: 10, marginTop: 2, fontFamily: fonts.body }
});
