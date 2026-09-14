import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '@/core/theme/tokens';

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
      <Text style={styles.tag}>{label}</Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.val}>
        {value} / {target} г
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 7 },
  tag: { width: 20, color: colors.paperFaint, fontFamily: fonts.mono, fontSize: 12 },
  track: { flex: 1, height: 3, backgroundColor: colors.lineStrong },
  fill: { height: '100%' },
  val: { width: 64, textAlign: 'right', color: colors.paperDim, fontFamily: fonts.mono, fontSize: 12.5 }
});
