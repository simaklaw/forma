export type ExerciseRigFamily = 'squat' | 'push-up' | 'seated-dumbbell-press';
export type ExerciseRigSex = 'male' | 'female';

export interface RigPoint {
  x: number;
  y: number;
}

export interface RigPose {
  head: RigPoint;
  neck: RigPoint;
  shoulder: RigPoint;
  elbowNear: RigPoint;
  wristNear: RigPoint;
  elbowFar: RigPoint;
  wristFar: RigPoint;
  hip: RigPoint;
  kneeNear: RigPoint;
  ankleNear: RigPoint;
  toeNear: RigPoint;
  kneeFar: RigPoint;
  ankleFar: RigPoint;
  toeFar: RigPoint;
}

const PILOT_RIGS: Record<number, ExerciseRigFamily> = {
  5: 'seated-dumbbell-press',
  10: 'push-up',
  13: 'squat'
};

/** Only map exercises whose movement is explicitly authored and reviewed. */
export function rigFamilyForExercise(exerciseId: number): ExerciseRigFamily | null {
  return PILOT_RIGS[exerciseId] ?? null;
}

const POSES: Record<ExerciseRigFamily, { start: RigPose; end: RigPose }> = {
  squat: {
    start: {
      head: { x: 145, y: 51 },
      neck: { x: 156, y: 69 },
      shoulder: { x: 161, y: 77 },
      elbowNear: { x: 180, y: 91 },
      wristNear: { x: 193, y: 104 },
      elbowFar: { x: 170, y: 93 },
      wristFar: { x: 184, y: 106 },
      hip: { x: 174, y: 121 },
      kneeNear: { x: 185, y: 155 },
      ankleNear: { x: 183, y: 196 },
      toeNear: { x: 211, y: 199 },
      kneeFar: { x: 174, y: 155 },
      ankleFar: { x: 173, y: 194 },
      toeFar: { x: 199, y: 197 }
    },
    end: {
      head: { x: 146, y: 64 },
      neck: { x: 157, y: 80 },
      shoulder: { x: 162, y: 88 },
      elbowNear: { x: 181, y: 101 },
      wristNear: { x: 196, y: 108 },
      elbowFar: { x: 171, y: 102 },
      wristFar: { x: 188, y: 111 },
      hip: { x: 176, y: 135 },
      kneeNear: { x: 205, y: 156 },
      ankleNear: { x: 190, y: 194 },
      toeNear: { x: 216, y: 197 },
      kneeFar: { x: 194, y: 158 },
      ankleFar: { x: 176, y: 194 },
      toeFar: { x: 201, y: 197 }
    }
  },
  'push-up': {
    start: {
      head: { x: 82, y: 82 },
      neck: { x: 97, y: 91 },
      shoulder: { x: 111, y: 98 },
      elbowNear: { x: 122, y: 119 },
      wristNear: { x: 132, y: 140 },
      elbowFar: { x: 112, y: 119 },
      wristFar: { x: 123, y: 141 },
      hip: { x: 176, y: 106 },
      kneeNear: { x: 218, y: 120 },
      ankleNear: { x: 256, y: 135 },
      toeNear: { x: 278, y: 140 },
      kneeFar: { x: 216, y: 124 },
      ankleFar: { x: 253, y: 138 },
      toeFar: { x: 274, y: 143 }
    },
    end: {
      head: { x: 82, y: 101 },
      neck: { x: 96, y: 110 },
      shoulder: { x: 111, y: 117 },
      elbowNear: { x: 132, y: 126 },
      wristNear: { x: 132, y: 140 },
      elbowFar: { x: 124, y: 128 },
      wristFar: { x: 123, y: 141 },
      hip: { x: 176, y: 118 },
      kneeNear: { x: 218, y: 124 },
      ankleNear: { x: 256, y: 135 },
      toeNear: { x: 278, y: 140 },
      kneeFar: { x: 216, y: 128 },
      ankleFar: { x: 253, y: 138 },
      toeFar: { x: 274, y: 143 }
    }
  },
  'seated-dumbbell-press': {
    start: {
      head: { x: 145, y: 55 },
      neck: { x: 157, y: 72 },
      shoulder: { x: 165, y: 81 },
      elbowNear: { x: 185, y: 93 },
      wristNear: { x: 193, y: 82 },
      elbowFar: { x: 173, y: 94 },
      wristFar: { x: 180, y: 84 },
      hip: { x: 175, y: 132 },
      kneeNear: { x: 211, y: 146 },
      ankleNear: { x: 225, y: 195 },
      toeNear: { x: 248, y: 198 },
      kneeFar: { x: 192, y: 147 },
      ankleFar: { x: 205, y: 194 },
      toeFar: { x: 226, y: 197 }
    },
    end: {
      head: { x: 145, y: 55 },
      neck: { x: 157, y: 72 },
      shoulder: { x: 165, y: 81 },
      elbowNear: { x: 188, y: 61 },
      wristNear: { x: 193, y: 35 },
      elbowFar: { x: 172, y: 61 },
      wristFar: { x: 178, y: 36 },
      hip: { x: 175, y: 132 },
      kneeNear: { x: 211, y: 146 },
      ankleNear: { x: 225, y: 195 },
      toeNear: { x: 248, y: 198 },
      kneeFar: { x: 192, y: 147 },
      ankleFar: { x: 205, y: 194 },
      toeFar: { x: 226, y: 197 }
    }
  }
};

function smoothstep(value: number): number {
  const clamped = Math.max(0, Math.min(1, value));
  return clamped * clamped * (3 - 2 * clamped);
}

function interpolatePoint(from: RigPoint, to: RigPoint, amount: number): RigPoint {
  return {
    x: from.x + (to.x - from.x) * amount,
    y: from.y + (to.y - from.y) * amount
  };
}

function interpolatePose(from: RigPose, to: RigPose, amount: number): RigPose {
  return {
    head: interpolatePoint(from.head, to.head, amount),
    neck: interpolatePoint(from.neck, to.neck, amount),
    shoulder: interpolatePoint(from.shoulder, to.shoulder, amount),
    elbowNear: interpolatePoint(from.elbowNear, to.elbowNear, amount),
    wristNear: interpolatePoint(from.wristNear, to.wristNear, amount),
    elbowFar: interpolatePoint(from.elbowFar, to.elbowFar, amount),
    wristFar: interpolatePoint(from.wristFar, to.wristFar, amount),
    hip: interpolatePoint(from.hip, to.hip, amount),
    kneeNear: interpolatePoint(from.kneeNear, to.kneeNear, amount),
    ankleNear: interpolatePoint(from.ankleNear, to.ankleNear, amount),
    toeNear: interpolatePoint(from.toeNear, to.toeNear, amount),
    kneeFar: interpolatePoint(from.kneeFar, to.kneeFar, amount),
    ankleFar: interpolatePoint(from.ankleFar, to.ankleFar, amount),
    toeFar: interpolatePoint(from.toeFar, to.toeFar, amount)
  };
}

/** Returns one complete pose for an animation cycle in the range [0, 1]. */
export function poseAt(family: ExerciseRigFamily, progress: number): RigPose {
  const poses = POSES[family];
  const cycle = ((progress % 1) + 1) % 1;
  const amount = cycle < 0.5 ? smoothstep(cycle * 2) : 1 - smoothstep((cycle - 0.5) * 2);
  return interpolatePose(poses.start, poses.end, amount);
}

export function rigGroundY(family: ExerciseRigFamily): number {
  return family === 'push-up' ? 145 : 205;
}

export function isPilotRigExercise(exerciseId: number): boolean {
  return rigFamilyForExercise(exerciseId) !== null;
}
