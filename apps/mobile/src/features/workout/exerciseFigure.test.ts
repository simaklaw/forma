/**
 * Тесты процедурной биомеханики фигуры приседания (чистая математика).
 */
import {
  figureKindForMediaKey,
  squatPose,
  SQUAT_LOOP_SEC,
  type Point,
  type SquatPose
} from './exerciseFigure';

const POSE_KEYS = ['hip', 'knee', 'ankle', 'toe', 'shoulder', 'head', 'elbow', 'hand'] as const;

function expectFinitePose(pose: SquatPose): void {
  for (const key of POSE_KEYS) {
    const pt: Point = pose[key];
    expect(Number.isFinite(pt.x)).toBe(true);
    expect(Number.isFinite(pt.y)).toBe(true);
  }
  expect(Number.isFinite(pose.kneeAngleDeg)).toBe(true);
}

describe('squatPose: биомеханика приседания', () => {
  test('границы цикла: t=0 — исходное положение', () => {
    const pose = squatPose(0);
    expect(pose.phase).toBe('top');
    expect(pose.depth).toBe(0);
  });

  test('середина цикла — параллель бёдер (hold, depth=1)', () => {
    const pose = squatPose(0.5);
    expect(pose.phase).toBe('hold');
    expect(pose.depth).toBe(1);
    expectFinitePose(pose);
  });

  test('опускание: глубина не убывает', () => {
    let prev = -1;
    for (let i = 0; i <= 20; i++) {
      const tt = (i / 20) * 0.45;
      const depth = squatPose(tt).depth;
      expect(depth).toBeGreaterThanOrEqual(prev);
      prev = depth;
    }
  });

  test('подъём: глубина не возрастает', () => {
    let prev = 2;
    for (let i = 0; i <= 20; i++) {
      const tt = 0.55 + (i / 20) * 0.4;
      const depth = squatPose(tt).depth;
      expect(depth).toBeLessThanOrEqual(prev);
      prev = depth;
    }
  });

  test('цикл замкнут: squatPose(t) ≈ squatPose(t + 1)', () => {
    const a = squatPose(0.73);
    const b = squatPose(1.73);
    expect(a.phase).toBe(b.phase);
    expect(b.depth).toBeCloseTo(a.depth, 9);
    expect(b.hip.x).toBeCloseTo(a.hip.x, 6);
    expect(b.knee.y).toBeCloseTo(a.knee.y, 6);
  });

  test('отрицательное t не ломает цикл (t=-0.27 ≡ t=0.73)', () => {
    const a = squatPose(-0.27);
    const b = squatPose(0.73);
    expect(a.phase).toBe(b.phase);
    expect(a.depth).toBeCloseTo(b.depth, 9);
  });

  test('угол колена в разумных пределах на всём цикле', () => {
    for (let i = 0; i < 50; i++) {
      const tt = i / 50;
      const angle = squatPose(tt).kneeAngleDeg;
      expect(angle).toBeGreaterThanOrEqual(87);
      expect(angle).toBeLessThanOrEqual(175);
    }
  });

  test('глубина и все координаты конечны на сэмплах цикла', () => {
    for (let i = 0; i < 50; i++) {
      const pose = squatPose(i / 50);
      expect(pose.depth).toBeGreaterThanOrEqual(0);
      expect(pose.depth).toBeLessThanOrEqual(1);
      expectFinitePose(pose);
    }
  });

  test('полная параллель даёт угол колена ~87°', () => {
    expect(squatPose(0.5).kneeAngleDeg).toBe(87);
  });
});

describe('squatPose: тайминги', () => {
  test('цикл объявлен равным 3 секундам', () => {
    expect(SQUAT_LOOP_SEC).toBe(3);
  });
});

describe('figureKindForMediaKey', () => {
  test('squat → фигура приседания', () => {
    expect(figureKindForMediaKey('squat')).toBe('squat');
  });

  test('прочие mediaKey и undefined → без фигуры', () => {
    expect(figureKindForMediaKey('pushup')).toBeNull();
    expect(figureKindForMediaKey(undefined)).toBeNull();
    expect(figureKindForMediaKey('')).toBeNull();
  });
});
