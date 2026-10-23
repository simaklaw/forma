import { mapHealthWorkoutToHealthKit, HK_ACTIVITY_TRADITIONAL_STRENGTH } from './mapWorkoutToHealthKit';
import { mapSessionToHealthWorkout } from './mapWorkoutToHealth';
import type { HealthWorkoutExport } from './types';

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

  /**
   * Builds the platform-agnostic export directly, bypassing upstream session
   * validation (which already rejects inverted and far-future ranges), so the
   * HealthKit mapper's own guards can be exercised in isolation.
   */
  function literalExport(startMs: number, endMs: number, kcal = 287.4): HealthWorkoutExport {
    return {
      startTime: new Date(startMs).toISOString(),
      endTime: new Date(endMs).toISOString(),
      activeCaloriesKcal: kcal,
      title: 'FitPulse workout',
      sessionId: 'sess-1',
      exerciseType: 80
    };
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

    const inverted = literalExport(now, now - 1000);
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
    const future = literalExport(now + 10 * 60 * 1000, now + 20 * 60 * 1000);
    expect(mapHealthWorkoutToHealthKit(future, now)).toBeNull();
  });
});
