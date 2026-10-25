/**
 * ExerciseFigure — процедурная анимация техники упражнения (P2).
 * Рисует stick-figure приседание с HUD: фаза, дыхание, угол колена.
 * Чистая математика позы — в exerciseFigure.ts (тестируется jest-ом),
 * здесь только отрисовка через react-native-svg.
 *
 * Происхождение: clean-room по разбору приложения пользователя
 * (Forma-Google-studio): оттуда взята идея анимированной фигуры
 * с подсказкой фазы и дыхания. Реализация с нуля.
 */
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { fonts, radius, spacing, type ColorTokens } from '@/core/theme/tokens';
import { useThemeColors } from '@/core/theme/useThemeColors';
import { useT, type StringKey } from '@/i18n/strings';
import {
  SQUAT_LOOP_SEC,
  squatPose,
  type FigureKind,
  type SquatPhase,
  type SquatPose
} from './exerciseFigure';

interface ExerciseFigureProps {
  kind: FigureKind;
  /** Анимировать, пока открыт шит упражнения. */
  playing: boolean;
}

const PHASE_LABEL_KEYS: Record<SquatPhase, StringKey> = {
  top: 'figurePhaseTop',
  descent: 'figurePhaseDescent',
  hold: 'figurePhaseHold',
  ascent: 'figurePhaseAscent'
};

const BREATH_LABEL_KEYS: Record<SquatPhase, StringKey> = {
  top: 'figureBreathReady',
  descent: 'figureBreathIn',
  hold: 'figureBreathHold',
  ascent: 'figureBreathOut'
};

const FRAME_THROTTLE_MS = 12;

export default function ExerciseFigure({ kind, playing }: ExerciseFigureProps) {
  const colors = useThemeColors();
  const t = useT();
  const [pose, setPose] = useState<SquatPose>(() => squatPose(0));
  const startRef = useRef<number | null>(null);
  const styles = React.useMemo(() => useStyles(colors), [colors]);

  useEffect(() => {
    if (!playing) {
      startRef.current = null;
      return;
    }
    let raf = 0;
    let lastFrame = 0;
    const tick = () => {
      const now = Date.now();
      if (startRef.current === null) startRef.current = now;
      if (now - lastFrame >= FRAME_THROTTLE_MS) {
        lastFrame = now;
        const elapsedSec = (now - startRef.current) / (SQUAT_LOOP_SEC * 1000);
        setPose(squatPose(elapsedSec));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  if (kind !== 'squat') return null;

  const stroke = pose.depth > 0.6 ? colors.ember : colors.lime;
  const phaseLabel = t(PHASE_LABEL_KEYS[pose.phase]);
  const breathLabel = t(BREATH_LABEL_KEYS[pose.phase]);

  return (
    <View style={styles.wrap}>
      <Svg viewBox="0 0 620 700" style={styles.svg} accessibilityLabel={phaseLabel}>
        {/* Пол */}
        <Line
          x1={40}
          y1={pose.floorY}
          x2={580}
          y2={pose.floorY}
          stroke={colors.line}
          strokeWidth={3}
          strokeDasharray="6 10"
        />
        {/* Ступня */}
        <Line
          x1={pose.ankle.x}
          y1={pose.ankle.y}
          x2={pose.toe.x}
          y2={pose.toe.y}
          stroke={stroke}
          strokeWidth={10}
          strokeLinecap="round"
        />
        {/* Голень и бедро */}
        <Line
          x1={pose.ankle.x}
          y1={pose.ankle.y}
          x2={pose.knee.x}
          y2={pose.knee.y}
          stroke={stroke}
          strokeWidth={10}
          strokeLinecap="round"
        />
        <Line
          x1={pose.knee.x}
          y1={pose.knee.y}
          x2={pose.hip.x}
          y2={pose.hip.y}
          stroke={stroke}
          strokeWidth={10}
          strokeLinecap="round"
        />
        {/* Корпус */}
        <Line
          x1={pose.hip.x}
          y1={pose.hip.y}
          x2={pose.shoulder.x}
          y2={pose.shoulder.y}
          stroke={stroke}
          strokeWidth={12}
          strokeLinecap="round"
        />
        {/* Голова */}
        <Circle cx={pose.head.x} cy={pose.head.y} r={16} fill={stroke} />
        {/* Руки (противовес) */}
        <Line
          x1={pose.shoulder.x}
          y1={pose.shoulder.y}
          x2={pose.elbow.x}
          y2={pose.elbow.y}
          stroke={colors.paperDim}
          strokeWidth={8}
          strokeLinecap="round"
        />
        <Line
          x1={pose.elbow.x}
          y1={pose.elbow.y}
          x2={pose.hand.x}
          y2={pose.hand.y}
          stroke={colors.paperDim}
          strokeWidth={8}
          strokeLinecap="round"
        />
        {/* Суставы */}
        <Circle cx={pose.knee.x} cy={pose.knee.y} r={6} fill={colors.paper} />
        <Circle cx={pose.hip.x} cy={pose.hip.y} r={6} fill={colors.paper} />
        <Circle cx={pose.shoulder.x} cy={pose.shoulder.y} r={6} fill={colors.paper} />
      </Svg>
      <View style={styles.hudRow}>
        <View style={[styles.hudChip, { borderColor: stroke }]}>
          <Text style={[styles.hudChipText, { color: stroke }]}>{phaseLabel}</Text>
        </View>
        <View style={styles.hudRight}>
          <Text style={styles.hudBreath}>{breathLabel}</Text>
          <Text style={styles.hudAngle}>
            {t('figureKneeAngle')}: {pose.kneeAngleDeg}°
          </Text>
        </View>
      </View>
    </View>
  );
}

function useStyles(colors: ColorTokens) {
  return StyleSheet.create({
    wrap: {
      marginTop: spacing.sm,
      marginBottom: spacing.sm,
      borderRadius: radius.lg,
      backgroundColor: colors.panel,
      borderWidth: 1,
      borderColor: colors.line,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md
    },
    svg: { width: '100%', height: 210 },
    hudRow: {
      marginTop: spacing.xs,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm
    },
    hudChip: {
      borderWidth: 1,
      borderRadius: radius.pill,
      paddingHorizontal: 10,
      paddingVertical: 4,
      flexShrink: 1
    },
    hudChipText: { fontFamily: fonts.mono, fontSize: 11 },
    hudRight: { alignItems: 'flex-end', flexShrink: 1 },
    hudBreath: { color: colors.paperDim, fontFamily: fonts.body, fontSize: 12 },
    hudAngle: { color: colors.paperFaint, fontFamily: fonts.mono, fontSize: 11, marginTop: 2 }
  });
}
