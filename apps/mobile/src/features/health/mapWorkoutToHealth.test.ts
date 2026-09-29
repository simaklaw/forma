import { HC_EXERCISE_STRENGTH_TRAINING } from './types';
import { mapSessionToHealthWorkout } from './mapWorkoutToHealth';

describe('mapSessionToHealthWorkout', () => {
  const now = Date.parse('2026-09-26T12:00:00.000Z');

  it('maps a completed session as strength training', () => {
    const out = mapSessionToHealthWorkout(
      {
        sessionId: 'sess-1',
        title: 'Грудь — жим',
        startedAtMs: now - 40 * 60 * 1000,
        completedAtMs: now - 5 * 60 * 1000,
        burnedKcal: 287.4
      },
      now
    );
    expect(out).not.toBeNull();
    expect(out!.activeCaloriesKcal).toBe(287);
    expect(out!.sessionId).toBe('sess-1');
    expect(out!.title).toContain('Грудь');
    expect(out!.exerciseType).toBe(HC_EXERCISE_STRENGTH_TRAINING);
    expect(Date.parse(out!.endTime)).toBeGreaterThan(Date.parse(out!.startTime));
  });

  it('rejects missing times or inverted range', () => {
    expect(
      mapSessionToHealthWorkout(
        {
          sessionId: 'x',
          title: 't',
          startedAtMs: null,
          completedAtMs: now,
          burnedKcal: 10
        },
        now
      )
    ).toBeNull();

    expect(
      mapSessionToHealthWorkout(
        {
          sessionId: 'x',
          title: 't',
          startedAtMs: now,
          completedAtMs: now - 1000,
          burnedKcal: 10
        },
        now
      )
    ).toBeNull();
  });

  it('rejects negative burn', () => {
    expect(
      mapSessionToHealthWorkout(
        {
          sessionId: 'x',
          title: 't',
          startedAtMs: now - 1000,
          completedAtMs: now,
          burnedKcal: -1
        },
        now
      )
    ).toBeNull();
  });
});
