/**
 * exerciseFigure — процедурная анимация техники упражнения (P2).
 * Чистая математика позы: никакой зависимости от React Native,
 * поэтому легко тестируется jest-ом. Отрисовка — ExerciseFigure.tsx.
 *
 * Происхождение: clean-room по разбору приложения пользователя
 * (Forma-Google-studio): оттуда взята идея «фигура + фаза + дыхание +
 * угол колена». Формулы биомеханики написаны с нуля.
 */

export type FigureKind = 'squat';

export type SquatPhase = 'top' | 'descent' | 'hold' | 'ascent';

export interface Point {
  x: number;
  y: number;
}

export interface SquatPose {
  /** 0 — стоя, 1 — полная параллель бёдер. */
  depth: number;
  phase: SquatPhase;
  kneeAngleDeg: number;
  hip: Point;
  knee: Point;
  ankle: Point;
  toe: Point;
  shoulder: Point;
  head: Point;
  elbow: Point;
  hand: Point;
  floorY: number;
}

/** Полный цикл приседания в секундах. */
export const SQUAT_LOOP_SEC = 3;

/** Длительность фаз в долях цикла (tt ∈ [0, 1)). */
const DESCENT_END = 0.45;
const HOLD_END = 0.55;
const ASCENT_END = 0.95;

function lerpPoint(a: Point, b: Point, k: number): Point {
  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
}

function radians(deg: number): number {
  return (deg * Math.PI) / 180;
}

function clamp01(v: number): number {
  if (Number.isNaN(v)) return 0;
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

/**
 * Поза фигуры в момент t (в секундах, произвольная дробная часть —
 * цикл замкнут: squatPose(t) ≈ squatPose(t + 1)).
 */
export function squatPose(t: number): SquatPose {
  const tt = ((t % 1) + 1) % 1;
  let phase: SquatPhase;
  let depth: number;
  if (tt < DESCENT_END) {
    phase = 'descent';
    depth = (1 - Math.cos((Math.PI * tt) / DESCENT_END)) / 2;
  } else if (tt < HOLD_END) {
    phase = 'hold';
    depth = 1;
  } else if (tt < ASCENT_END) {
    phase = 'ascent';
    depth = (1 + Math.cos((Math.PI * (tt - HOLD_END)) / (ASCENT_END - HOLD_END))) / 2;
  } else {
    phase = 'top';
    depth = 0;
  }
  depth = clamp01(depth);

  const floorY = 660;
  const cx = 310;
  const ankle: Point = { x: cx - 25, y: floorY - 20 };
  const toe: Point = { x: cx + 55, y: floorY - 10 };
  const knee = lerpPoint({ x: cx - 15, y: 490 }, { x: cx + 42, y: 520 }, depth);
  const hip = lerpPoint({ x: cx - 15, y: 380 }, { x: cx - 85, y: 525 }, depth);

  // Корпус наклоняется вперёд по мере глубины.
  const torsoLen = 175;
  const torsoAngleDeg = 12 + depth * 28;
  const torsoRad = radians(torsoAngleDeg);
  const shoulder: Point = {
    x: hip.x + torsoLen * Math.sin(torsoRad),
    y: hip.y - torsoLen * Math.cos(torsoRad)
  };
  const headRad = radians(torsoAngleDeg - 8);
  const head: Point = {
    x: shoulder.x + 52 * Math.sin(headRad),
    y: shoulder.y - 52 * Math.cos(headRad)
  };

  // Руки выносятся вперёд для противовеса.
  const reach = depth;
  const elbow: Point = {
    x: shoulder.x + (55 + reach * 45),
    y: shoulder.y + (45 - reach * 10)
  };
  const hand: Point = {
    x: elbow.x + (50 + reach * 55),
    y: elbow.y + (-10 - reach * 25)
  };

  return {
    depth,
    phase,
    kneeAngleDeg: Math.round(175 - depth * 88),
    hip,
    knee,
    ankle,
    toe,
    shoulder,
    head,
    elbow,
    hand,
    floorY
  };
}

/**
 * Какую фигуру показывать для mediaKey упражнения.
 * null — фигуры нет (не врём о технике там, где нет анимации).
 */
export function figureKindForMediaKey(key?: string): FigureKind | null {
  return key === 'squat' ? 'squat' : null;
}
