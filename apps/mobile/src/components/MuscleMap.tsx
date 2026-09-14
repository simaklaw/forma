/**
 * MuscleMap.tsx
 *
 * Visual target-muscle map: a plain body silhouette with the exercise's
 * target muscle groups highlighted as pulsing markers. This fills a real
 * content gap the project had (see HANDOFF.md) — target muscles were plain
 * text ("квадрицепс, ягодицы, кор") with no visual reference at all.
 *
 * Concept adapted from a Flutter reference project's MuscleMapWidget
 * (CustomPainter silhouette + flutter_animate radial-gradient glow).
 * Reimplemented here on react-native-svg + react-native-reanimated — both
 * already project dependencies, so no new packages — and restyled to the
 * protocol/scoreboard identity: square markers in the single cyan info
 * accent instead of a soft primary-colored gradient circle, plain stroked
 * silhouette instead of a rounded/gradient one. The muscle-name caption
 * stays as real text underneath: the SVG marker positions carry no
 * semantic information for screen readers.
 */

import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Line, Rect } from 'react-native-svg';
import { colors, fonts } from '@/core/theme/tokens';

const WIDTH = 140;
const HEIGHT = 220;
const MARKER_SIZE = 22;

export type MuscleKey =
  | 'chest'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'core'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'lowerback'
  | 'back';

const MUSCLE_LABELS: Record<MuscleKey, string> = {
  chest: 'грудь',
  shoulders: 'плечи',
  biceps: 'бицепс',
  triceps: 'трицепс',
  core: 'кор',
  quads: 'квадрицепс',
  hamstrings: 'бицепс бедра',
  glutes: 'ягодицы',
  lowerback: 'поясница',
  back: 'спина'
};

// Pixel centers within the WIDTH×HEIGHT viewBox, ported from the Flutter
// reference's normalized -1..1 alignment coordinates onto this silhouette.
const MUSCLE_POSITIONS: Record<MuscleKey, { x: number; y: number }> = {
  chest: { x: 70, y: 72 },
  shoulders: { x: 46, y: 55 },
  biceps: { x: 42, y: 94 },
  triceps: { x: 98, y: 94 },
  core: { x: 70, y: 105 },
  quads: { x: 60, y: 160 },
  hamstrings: { x: 81, y: 160 },
  glutes: { x: 70, y: 138 },
  lowerback: { x: 70, y: 116 },
  back: { x: 70, y: 83 }
};

const AnimatedRect = Animated.createAnimatedComponent(Rect);

function MuscleMarker({ x, y }: { x: number; y: number }) {
  const pulse = useSharedValue(0.4);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [pulse]);

  const animatedProps = useAnimatedProps(() => ({ opacity: pulse.value }));

  return (
    <AnimatedRect
      x={x - MARKER_SIZE / 2}
      y={y - MARKER_SIZE / 2}
      width={MARKER_SIZE}
      height={MARKER_SIZE}
      fill={colors.cyan}
      animatedProps={animatedProps}
    />
  );
}

interface Props {
  targetMuscles: MuscleKey[];
}

export default function MuscleMap({ targetMuscles }: Props) {
  return (
    <View style={styles.wrap}>
      <Svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
        {/* Silhouette: head, torso, arms, hips, legs — stroke only, same
            layout as the Flutter reference's CustomPainter, drawn here with
            plain SVG primitives instead of a Canvas painter. */}
        <Circle cx={70} cy={20} r={15} stroke={colors.lineStrong} strokeWidth={2.5} fill="none" />
        <Rect x={39} y={44} width={62} height={70} rx={10} stroke={colors.lineStrong} strokeWidth={2.5} fill="none" />
        <Line x1={39} y1={55} x2={11} y2={110} stroke={colors.lineStrong} strokeWidth={2.5} strokeLinecap="round" />
        <Line x1={101} y1={55} x2={129} y2={110} stroke={colors.lineStrong} strokeWidth={2.5} strokeLinecap="round" />
        <Rect x={42} y={114} width={56} height={26} rx={8} stroke={colors.lineStrong} strokeWidth={2.5} fill="none" />
        <Line x1={56} y1={141} x2={48} y2={216} stroke={colors.lineStrong} strokeWidth={2.5} strokeLinecap="round" />
        <Line x1={84} y1={141} x2={92} y2={216} stroke={colors.lineStrong} strokeWidth={2.5} strokeLinecap="round" />

        {targetMuscles.map((key) => {
          const pos = MUSCLE_POSITIONS[key];
          return pos ? <MuscleMarker key={key} x={pos.x} y={pos.y} /> : null;
        })}
      </Svg>
      <Text style={styles.caption}>
        <Text style={styles.captionLabel}>Целевые мышцы: </Text>
        {targetMuscles.map((k) => MUSCLE_LABELS[k]).join(', ')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', marginTop: 4 },
  caption: { color: colors.paperFaint, fontSize: 12, marginTop: 8, textAlign: 'center', fontFamily: fonts.body },
  captionLabel: { color: colors.paperDim, fontFamily: fonts.bodySemi }
});
