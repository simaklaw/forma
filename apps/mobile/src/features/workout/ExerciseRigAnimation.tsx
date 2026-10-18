import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop
} from 'react-native-svg';
import { useThemeColors } from '@/core/theme/useThemeColors';
import {
  poseAt,
  rigFamilyForExercise,
  rigGroundY,
  type RigPoint,
  type RigPose,
  type ExerciseRigSex
} from './exerciseRigModel';

interface Props {
  exerciseId: number;
  sex: ExerciseRigSex;
}

function segment(
  key: string,
  from: RigPoint,
  to: RigPoint,
  gradient: string,
  width: number,
  opacity = 1
) {
  return (
    <G key={key} opacity={opacity}>
      <Line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="#0E2228" strokeWidth={width + 6} strokeLinecap="round" />
      <Line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={gradient} strokeWidth={width} strokeLinecap="round" />
      <Line x1={from.x - 2} y1={from.y - 1.5} x2={to.x - 2} y2={to.y - 1.5} stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" opacity={0.18} />
    </G>
  );
}

function torsoPath(pose: RigPose, sex: ExerciseRigSex): string {
  const dx = pose.hip.x - pose.shoulder.x;
  const dy = pose.hip.y - pose.shoulder.y;
  const length = Math.max(1, Math.sqrt(dx * dx + dy * dy));
  const nx = dy / length;
  const ny = -dx / length;
  const shoulderWidth = sex === 'female' ? 14 : 17;
  const hipWidth = sex === 'female' ? 13 : 11;
  const a = { x: pose.shoulder.x + nx * shoulderWidth, y: pose.shoulder.y + ny * shoulderWidth };
  const b = { x: pose.shoulder.x - nx * shoulderWidth, y: pose.shoulder.y - ny * shoulderWidth };
  const c = { x: pose.hip.x - nx * hipWidth, y: pose.hip.y - ny * hipWidth };
  const d = { x: pose.hip.x + nx * hipWidth, y: pose.hip.y + ny * hipWidth };
  const mx = (pose.shoulder.x + pose.hip.x) / 2;
  const my = (pose.shoulder.y + pose.hip.y) / 2;
  return 'M ' + a.x + ' ' + a.y +
    ' Q ' + (a.x + pose.shoulder.x) / 2 + ' ' + (a.y + pose.shoulder.y) / 2 + ' ' + pose.shoulder.x + ' ' + pose.shoulder.y +
    ' Q ' + (b.x + pose.shoulder.x) / 2 + ' ' + (b.y + pose.shoulder.y) / 2 + ' ' + b.x + ' ' + b.y +
    ' Q ' + mx + ' ' + my + ' ' + c.x + ' ' + c.y +
    ' Q ' + (c.x + pose.hip.x) / 2 + ' ' + (c.y + pose.hip.y) / 2 + ' ' + pose.hip.x + ' ' + pose.hip.y +
    ' Q ' + (d.x + pose.hip.x) / 2 + ' ' + (d.y + pose.hip.y) / 2 + ' ' + d.x + ' ' + d.y +
    ' Q ' + mx + ' ' + my + ' ' + a.x + ' ' + a.y + ' Z';
}

function joint(point: RigPoint, radius = 5, color = '#C8DFD2') {
  return (
    <Circle
      cx={point.x}
      cy={point.y}
      r={radius}
      fill={color}
      stroke="#17352F"
      strokeWidth={2}
    />
  );
}

function dumbbell(point: RigPoint, key: string) {
  return (
    <G key={key} transform={'translate(' + point.x + ' ' + point.y + ')'}>
      <Line x1={-8} y1={0} x2={8} y2={0} stroke="#20333C" strokeWidth={4} strokeLinecap="round" />
      <Rect x={-13} y={-5} width={5} height={10} rx={1.5} fill="#8EA6A4" stroke="#1C3037" strokeWidth={1.5} />
      <Rect x={8} y={-5} width={5} height={10} rx={1.5} fill="#8EA6A4" stroke="#1C3037" strokeWidth={1.5} />
      <Line x1={-11} y1={-2.5} x2={-11} y2={2.5} stroke="#D6E8E2" strokeWidth={1} />
      <Line x1={10} y1={-2.5} x2={10} y2={2.5} stroke="#D6E8E2" strokeWidth={1} />
    </G>
  );
}

export default function ExerciseRigAnimation({ exerciseId, sex }: Props) {
  const colors = useThemeColors();
  const family = rigFamilyForExercise(exerciseId);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!family) return undefined;
    const started = Date.now();
    const timer = setInterval(() => {
      setProgress(((Date.now() - started) % 2600) / 2600);
    }, 42);
    return () => clearInterval(timer);
  }, [family]);

  if (!family) return null;

  const pose = poseAt(family, progress);
  const groundY = rigGroundY(family);
  const prefix = 'rig-' + exerciseId;
  const skin = 'url(#' + prefix + '-skin)';
  const shirt = 'url(#' + prefix + '-shirt)';
  const pants = 'url(#' + prefix + '-pants)';
  const isPress = family === 'seated-dumbbell-press';
  const floorLeft = family === 'push-up' ? 44 : 91;
  const floorRight = family === 'push-up' ? 304 : 258;
  const torso = torsoPath(pose, sex);
  const hair = sex === 'female'
    ? 'M ' + (pose.head.x - 8) + ' ' + (pose.head.y - 4) +
      ' Q ' + (pose.head.x - 2) + ' ' + (pose.head.y - 17) + ' ' + (pose.head.x + 8) + ' ' + (pose.head.y - 6) +
      ' Q ' + (pose.head.x + 14) + ' ' + (pose.head.y + 4) + ' ' + (pose.head.x + 8) + ' ' + (pose.head.y + 11) +
      ' Q ' + (pose.head.x + 2) + ' ' + (pose.head.y + 3) + ' ' + (pose.head.x - 8) + ' ' + (pose.head.y - 4) + ' Z'
    : 'M ' + (pose.head.x - 11) + ' ' + (pose.head.y - 2) +
      ' Q ' + (pose.head.x - 9) + ' ' + (pose.head.y - 15) + ' ' + (pose.head.x + 3) + ' ' + (pose.head.y - 13) +
      ' Q ' + (pose.head.x + 12) + ' ' + (pose.head.y - 10) + ' ' + (pose.head.x + 12) + ' ' + (pose.head.y - 1) +
      ' L ' + (pose.head.x + 5) + ' ' + (pose.head.y - 4) +
      ' Q ' + (pose.head.x - 3) + ' ' + (pose.head.y - 7) + ' ' + (pose.head.x - 11) + ' ' + (pose.head.y - 2) + ' Z';

  return (
    <View
      style={[styles.hero, { backgroundColor: colors.panel, borderColor: colors.lineStrong }]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={
        sex === 'female' ? 'Анимация упражнения с женщиной' : 'Анимация упражнения с мужчиной'
      }
    >
      <Svg width="100%" height="100%" viewBox="0 0 360 224" preserveAspectRatio="xMidYMid meet">
        <Defs>
          <LinearGradient id={prefix + '-skin'} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#F1D5BB" />
            <Stop offset="55%" stopColor="#D6AA87" />
            <Stop offset="100%" stopColor="#A97559" />
          </LinearGradient>
          <LinearGradient id={prefix + '-shirt'} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={sex === 'female' ? '#427B70' : '#2A7863'} />
            <Stop offset="100%" stopColor={sex === 'female' ? '#193E3B' : '#123B36'} />
          </LinearGradient>
          <LinearGradient id={prefix + '-pants'} x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#203C43" />
            <Stop offset="100%" stopColor="#0E252D" />
          </LinearGradient>
          <LinearGradient id={prefix + '-floor'} x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={colors.lime} stopOpacity={0.17} />
            <Stop offset="100%" stopColor={colors.lime} stopOpacity={0} />
          </LinearGradient>
        </Defs>

        <Circle cx={288} cy={30} r={78} fill={colors.ink} opacity={0.12} />
        <Circle cx={58} cy={170} r={60} fill={colors.lime} opacity={0.035} />
        <Line x1={24} y1={groundY} x2={336} y2={groundY} stroke={colors.lineStrong} strokeWidth={1} />
        <Ellipse cx={(floorLeft + floorRight) / 2} cy={groundY + 1} rx={(floorRight - floorLeft) / 2} ry={14} fill={'url(#' + prefix + '-floor)'} />

        {isPress ? (
          <G opacity={0.92}>
            <Rect x={155} y={132} width={70} height={8} rx={4} fill="#233F43" stroke="#10272B" strokeWidth={2} />
            <Line x1={164} y1={139} x2={158} y2={199} stroke="#294B4B" strokeWidth={5} strokeLinecap="round" />
            <Line x1={215} y1={139} x2={220} y2={199} stroke="#294B4B" strokeWidth={5} strokeLinecap="round" />
            <Line x1={157} y1={199} x2={170} y2={199} stroke="#294B4B" strokeWidth={5} strokeLinecap="round" />
            <Line x1={214} y1={199} x2={228} y2={199} stroke="#294B4B" strokeWidth={5} strokeLinecap="round" />
          </G>
        ) : null}

        {segment('far-thigh', pose.hip, pose.kneeFar, pants, 17, 0.62)}
        {segment('far-shin', pose.kneeFar, pose.ankleFar, pants, 14, 0.62)}
        {segment('far-foot', pose.ankleFar, pose.toeFar, '#142A30', 8, 0.62)}
        {segment('far-upper-arm', pose.shoulder, pose.elbowFar, skin, 13, 0.55)}
        {segment('far-forearm', pose.elbowFar, pose.wristFar, skin, 11, 0.55)}

        <Path d={torso} fill={shirt} stroke="#112D31" strokeWidth={4} strokeLinejoin="round" />
        <Path
          d={'M ' + (pose.shoulder.x - 3) + ' ' + (pose.shoulder.y + 9) +
            ' Q ' + (pose.hip.x - 9) + ' ' + ((pose.shoulder.y + pose.hip.y) / 2) +
            ' ' + (pose.hip.x - 3) + ' ' + (pose.hip.y - 8)}
          fill="none"
          stroke="#9DCCB8"
          strokeWidth={1.5}
          opacity={0.48}
          strokeLinecap="round"
        />
        <Path
          d={'M ' + (pose.shoulder.x + 4) + ' ' + (pose.shoulder.y + 7) +
            ' Q ' + (pose.shoulder.x + 7) + ' ' + (pose.shoulder.y + 17) +
            ' ' + (pose.shoulder.x + 2) + ' ' + (pose.shoulder.y + 21)}
          fill="none"
          stroke="#B9E2CE"
          strokeWidth={1.5}
          opacity={0.5}
          strokeLinecap="round"
        />

        {segment('near-thigh', pose.hip, pose.kneeNear, pants, 19)}
        {segment('near-shin', pose.kneeNear, pose.ankleNear, pants, 15)}
        {segment('near-foot', pose.ankleNear, pose.toeNear, '#0E252D', 9)}
        {segment('near-upper-arm', pose.shoulder, pose.elbowNear, skin, 15)}
        {segment('near-forearm', pose.elbowNear, pose.wristNear, skin, 12)}

        {joint(pose.kneeFar, 4.2, '#96BEB0')}
        {joint(pose.elbowFar, 3.5, '#E7C2A1')}
        {joint(pose.kneeNear, 5)}
        {joint(pose.elbowNear, 4.5, '#F1D5BB')}
        {joint(pose.wristNear, 3.8, '#F1D5BB')}
        {joint(pose.wristFar, 3.4, '#D6AA87')}

        {isPress ? (
          <>
            {dumbbell(pose.wristFar, 'far-dumbbell')}
            {dumbbell(pose.wristNear, 'near-dumbbell')}
          </>
        ) : null}

        <Line x1={pose.neck.x} y1={pose.neck.y} x2={pose.shoulder.x} y2={pose.shoulder.y} stroke={skin} strokeWidth={12} strokeLinecap="round" />
        <Line x1={pose.neck.x - 1} y1={pose.neck.y} x2={pose.shoulder.x - 1} y2={pose.shoulder.y} stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" opacity={0.18} />
        {sex === 'female' ? (
          <Path
            d={'M ' + (pose.head.x - 8) + ' ' + (pose.head.y - 4) +
              ' Q ' + (pose.head.x - 22) + ' ' + (pose.head.y - 3) +
              ' ' + (pose.head.x - 16) + ' ' + (pose.head.y + 13) +
              ' Q ' + (pose.head.x - 10) + ' ' + (pose.head.y + 16) +
              ' ' + (pose.head.x - 7) + ' ' + (pose.head.y + 4)}
            fill="none"
            stroke="#3B2B2B"
            strokeWidth={6}
            strokeLinecap="round"
          />
        ) : null}
        <Circle cx={pose.head.x} cy={pose.head.y} r={12} fill={skin} stroke="#17352F" strokeWidth={2.5} />
        <Path d={hair} fill="#332A28" stroke="#172D2D" strokeWidth={1.5} strokeLinejoin="round" />
        <Path
          d={'M ' + (pose.head.x + 9) + ' ' + (pose.head.y + 1) +
            ' L ' + (pose.head.x + 13) + ' ' + (pose.head.y + 4) +
            ' L ' + (pose.head.x + 9) + ' ' + (pose.head.y + 5)}
          fill="none"
          stroke="#925E4A"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Circle cx={pose.head.x + 5} cy={pose.head.y - 1} r={1.2} fill="#1A292A" />

        <G opacity={0.88}>
          <Circle cx={27} cy={23} r={3} fill={colors.lime} />
          <Rect x={36} y={20} width={36} height={6} rx={3} fill={colors.lineStrong} />
          <Rect x={76} y={20} width={13} height={6} rx={3} fill={colors.lime} opacity={0.55} />
        </G>
      </Svg>
      <View pointerEvents="none" style={styles.badge}>
        <Text style={styles.badgeText}>2D DEMO</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    height: 180,
    width: '100%',
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 8
  },
  badge: {
    position: 'absolute',
    right: 10,
    top: 9,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(8, 25, 27, 0.82)',
    borderRadius: 7,
    borderWidth: 1,
    borderColor: 'rgba(173, 222, 200, 0.55)'
  },
  badgeText: {
    color: '#CDEFE0',
    fontSize: 8,
    letterSpacing: 1.4,
    fontWeight: '800'
  }
});
