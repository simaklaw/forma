import {
  isPilotRigExercise,
  poseAt,
  rigFamilyForExercise,
  type ExerciseRigFamily,
  type RigPose
} from './exerciseRigModel';

describe('exerciseRigModel', () => {
  it('only exposes the three reviewed pilot exercises', () => {
    expect(rigFamilyForExercise(13)).toBe('squat');
    expect(rigFamilyForExercise(10)).toBe('push-up');
    expect(rigFamilyForExercise(5)).toBe('seated-dumbbell-press');
    expect(rigFamilyForExercise(999)).toBeNull();
    expect(isPilotRigExercise(13)).toBe(true);
    expect(isPilotRigExercise(999)).toBe(false);
  });

  it.each<ExerciseRigFamily>(['squat', 'push-up', 'seated-dumbbell-press'])(
    'returns finite complete poses for %s',
    (family) => {
      const pose = poseAt(family, 0.25);
      const points = Object.values(pose) as RigPose[keyof RigPose][];
      expect(points).toHaveLength(14);
      for (const point of points) {
        expect(Number.isFinite(point.x)).toBe(true);
        expect(Number.isFinite(point.y)).toBe(true);
      }
    }
  );

  it.each<ExerciseRigFamily>(['squat', 'push-up', 'seated-dumbbell-press'])(
    'forms a continuous loop for %s',
    (family) => {
      const start = poseAt(family, 0);
      const end = poseAt(family, 1);
      expect(end.head.x).toBeCloseTo(start.head.x, 5);
      expect(end.head.y).toBeCloseTo(start.head.y, 5);
      expect(end.hip.x).toBeCloseTo(start.hip.x, 5);
      expect(end.hip.y).toBeCloseTo(start.hip.y, 5);
    }
  );

  it('moves the appropriate points between rest and active poses', () => {
    const squatUp = poseAt('squat', 0);
    const squatDown = poseAt('squat', 0.5);
    expect(squatDown.hip.y).toBeGreaterThan(squatUp.hip.y);

    const pushUp = poseAt('push-up', 0);
    const pushDown = poseAt('push-up', 0.5);
    expect(pushDown.shoulder.y).toBeGreaterThan(pushUp.shoulder.y);

    const pressDown = poseAt('seated-dumbbell-press', 0);
    const pressUp = poseAt('seated-dumbbell-press', 0.5);
    expect(pressUp.wristNear.y).toBeLessThan(pressDown.wristNear.y);
  });
});
