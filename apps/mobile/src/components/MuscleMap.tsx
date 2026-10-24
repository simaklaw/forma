/**
 * MuscleMap.tsx
 *
 * Visual target-muscle map: body silhouettes (front and/or back view) with
 * the exercise's target muscles highlighted as markers. The first key of
 * targetMuscles is the primary muscle (cyan, pulsing); the rest are
 * synergists (dimmed, static). The back view gives an anatomically honest
 * picture of glutes, hamstrings, triceps and the back — the front/back
 * idea comes from the Muscle Visualizer API review; the implementation is
 * local, with no external services.
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
import { type MuscleKey } from '@/domain/muscleKeys';
import { useLanguageStore } from '@/i18n/useLanguageStore';
import { useT, muscleLabel } from '@/i18n/strings';
import { fonts, type ColorTokens } from '@/core/theme/tokens';
import { useThemeColors } from '@/core/theme/useThemeColors';
import { splitMusclesByView } from './muscleViews';

export { MUSCLE_LABELS } from '@/domain/muscleKeys';
export type { MuscleKey } from '@/domain/muscleKeys';

const WIDTH = 140;
const HEIGHT = 220;
/** Когда показываются оба вида, силуэты ужимаются, чтобы не вылезти за ширину листа. */
const COMPACT_WIDTH = 112;
const MARKER_SIZE = 22;

/** Маркеры переднего вида (грудь, дельты, бицепс, кор, квадрицепсы). */
const FRONT_POSITIONS: Partial<Record<MuscleKey, { x: number; y: number }>> = {
  chest: { x: 70, y: 72 },
  shoulders: { x: 46, y: 55 },
  biceps: { x: 42, y: 94 },
  core: { x: 70, y: 105 },
  quads: { x: 60, y: 160 }
};

/** Маркеры заднего вида (спина, трицепс, ягодицы, бицепс бедра, икры). */
const BACK_POSITIONS: Partial<Record<MuscleKey, { x: number; y: number }>> = {
  shoulders: { x: 46, y: 55 },
  triceps: { x: 98, y: 94 },
  back: { x: 70, y: 83 },
  lowerback: { x: 70, y: 116 },
  glutes: { x: 70, y: 138 },
  hamstrings: { x: 81, y: 160 },
  calves: { x: 70, y: 190 }
};

const AnimatedRect = Animated.createAnimatedComponent(Rect);

/** Маркер основной мышцы: циановый акцент с пульсом. */
function PrimaryMarker({ x, y, color }: { x: number; y: number; color: string }) {
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
      fill={color}
      animatedProps={animatedProps}
    />
  );
}

/** Маркер синергиста: приглушённый, статичный. */
function SynergistMarker({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <Rect
      x={x - MARKER_SIZE / 2}
      y={y - MARKER_SIZE / 2}
      width={MARKER_SIZE}
      height={MARKER_SIZE}
      fill={color}
      fillOpacity={0.7}
    />
  );
}

/** Силуэт одного вида с маркерами мышц. */
function BodySilhouette({
  muscles,
  positions,
  primary,
  colors,
  width,
  viewLabel
}: {
  muscles: MuscleKey[];
  positions: Partial<Record<MuscleKey, { x: number; y: number }>>;
  primary: MuscleKey | undefined;
  colors: ColorTokens;
  width: number;
  viewLabel: string;
}) {
  const height = Math.round((width * HEIGHT) / WIDTH);
  return (
    <View style={staticStyles.view}>
      <Svg width={width} height={height} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
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

        {muscles.map((key) => {
          const pos = positions[key];
          if (!pos) return null;
          return key === primary ? (
            <PrimaryMarker key={key} x={pos.x} y={pos.y} color={colors.cyan} />
          ) : (
            <SynergistMarker key={key} x={pos.x} y={pos.y} color={colors.paperDim} />
          );
        })}
      </Svg>
      <Text style={[staticStyles.viewLabel, { color: colors.paperFaint }]}>{viewLabel}</Text>
    </View>
  );
}

interface Props {
  targetMuscles: MuscleKey[];
}

export default function MuscleMap({ targetMuscles }: Props) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const t = useT();
  const lang = useLanguageStore((s) => s.lang);
  const { front, back } = splitMusclesByView(targetMuscles);
  const primary = targetMuscles[0];
  // Пустой список мышц — один силуэт анфас, как раньше.
  const showFront = front.length > 0 || back.length === 0;
  const showBack = back.length > 0;
  const width = showFront && showBack ? COMPACT_WIDTH : WIDTH;

  return (
    <View
      style={styles.wrap}
      accessible
      accessibilityLabel={`${t('muscleCaption')}${targetMuscles.map((k) => muscleLabel(k, lang)).join(', ')}`}
    >
      <View style={staticStyles.row}>
        {showFront ? (
          <BodySilhouette
            muscles={front}
            positions={FRONT_POSITIONS}
            primary={primary}
            colors={colors}
            width={width}
            viewLabel={t('muscleViewFront')}
          />
        ) : null}
        {showBack ? (
          <BodySilhouette
            muscles={back}
            positions={BACK_POSITIONS}
            primary={primary}
            colors={colors}
            width={width}
            viewLabel={t('muscleViewBack')}
          />
        ) : null}
      </View>
      <Text style={styles.caption}>
        <Text style={styles.captionLabel}>{t('muscleCaption')}</Text>
        {targetMuscles.map((k) => muscleLabel(k, lang)).join(', ')}
      </Text>
    </View>
  );
}

const staticStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  view: { alignItems: 'center' },
  viewLabel: { fontFamily: fonts.mono, fontSize: 10, marginTop: 2 }
});

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    wrap: { alignItems: 'center', marginTop: 4 },
    caption: { color: colors.paperFaint, fontSize: 12, marginTop: 8, textAlign: 'center', fontFamily: fonts.body },
    captionLabel: { color: colors.paperDim, fontFamily: fonts.bodySemi }
  });
}
