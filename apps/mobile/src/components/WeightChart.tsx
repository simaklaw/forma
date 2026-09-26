/**
 * WeightChart.tsx — same Skia-vs-SVG tradeoff note as CalorieRing.tsx.
 */
import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';
import { useThemeColors } from '@/core/theme/useThemeColors';

interface Props {
  history: number[];
  width?: number;
  height?: number;
}

export default function WeightChart({ history, width = 340, height = 70 }: Props) {
  const colors = useThemeColors();
  const points = history.slice(-7);
  if (points.length < 2) return <View style={{ width, height }} />;

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const stepX = width / (points.length - 1);

  const coords = points.map((w, i) => {
    const x = Math.round(i * stepX);
    const y = Math.round((height - 12) - ((w - min) / range) * (height - 24));
    return `${x},${y}`;
  });
  const [lastX, lastY] = coords[coords.length - 1].split(',').map(Number);

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Polyline points={coords.join(' ')} fill="none" stroke={colors.cyan} strokeWidth={2} />
      <Circle cx={lastX} cy={lastY} r={3.5} fill={colors.cyan} />
    </Svg>
  );
}
