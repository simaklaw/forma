import { mapHealthWorkoutToHealthKit, HK_ACTIVITY_TRADITIONAL_STRENGTH } from './mapWorkoutToHealthKit';
import { mapSessionToHealthWorkout } from './mapWorkoutToHealth';

describe('mapHealthWorkoutToHealthKit', () => {
  const now = Date.parse('2026-09-26T12:00:00.000Z');

  function exportFrom(startMs: number, endMs: number, kcal = 287.4) {
    return mapSessionToHealthWorkout(
      {
        sessionId: 'sess-1',
        title: 'FitPulse workout',
        startedAtMs: startMs,
        completedAtMs: endMs,
        burnedKcal: kcal
      },
      now
    )!;
  }

  it('maps an exported workout into a HealthKit save plan', () => {
    const plan = mapHealthWorkoutToHealthKit(
      exportFrom(now - 40 * 60 * 1000, now - 5 * 60 * 1000),
      now
    );
    expect(plan).not.toBeNull();
    expect(plan!.activityType).toBe(HK_ACTIVITY_TRADITIONAL_STRENGTH);
    expect(plan!.energyBurnedKcal).toBe(287);
    expect(plan!.syncId).toBe('fitpulse-sess-1');
    expect(plan!.start.getTime()).toBeLessThan(plan!.end.getTime());
  });

  it('rejects inverted or unparseable ranges', () => {
    expect(
      mapHealthWorkoutToHealthKit(
        { ...exportFrom(now - 1000, now), startTime: 'not-a-date' },
        now
      )
    ).toBeNull();

    const inverted = exportFrom(now, now - 1000);
    expect(inverted).not.toBeNull();
    expect(mapHealthWorkoutToHealthKit(inverted, now)).toBeNull();
  });

  it('rejects negative energy and empty session id', () => {
    expect(
      mapHealthWorkoutToHealthKit(
        { ...exportFrom(now - 1000, now), activeCaloriesKcal: -1 },
        now
      )
    ).toBeNull();

    expect(
      mapHealthWorkoutToHealthKit(
        { ...exportFrom(now - 1000, now), sessionId: '   ' },
        now
      )
    ).toBeNull();
  });

  it('rejects sessions dated in the future beyond clock skew', () => {
    const future = exportFrom(now + 10 * 60 * 1000, now + 20 * 60 * 1000);
    expect(future).not.toBeNull();
    expect(mapHealthWorkoutToHealthKit(future, now)).toBeNull();
  });
});
