import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius } from '@/core/theme/tokens';

interface Props {
  label: string;
  value: number;
  target: number;
  color: string;
}

export default function MacroBar({ label, value, target, color }: Props) {
  const pct = Math.min(100, Math.round((value / Math.max(1, target)) * 100));
  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.tag}>{label}</Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.val}>
        {Math.round(value)}/{Math.round(target)} г
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  dot: { width: 7, height: 7, borderRadius: radius.pill },
  tag: { width: 16, color: colors.paperFaint, fontFamily: fonts.mono, fontSize: 12 },
  track: {
    flex: 1,
    height: 6,
    backgroundColor: colors.lineStrong,
    borderRadius: radius.pill,
    overflow: 'hidden'
  },
  fill: { height: '100%', borderRadius: radius.pill },
  val: {
    minWidth: 72,
    textAlign: 'right',
    color: colors.paperDim,
    fontFamily: fonts.mono,
    fontSize: 12.5
  }
});
