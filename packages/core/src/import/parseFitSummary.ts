/**
 * Map a decoded FIT session/activity message blob into ImportedActivity.
 * Decoder-agnostic: accepts plain objects from fit-file-parser / @garmin/fitsdk / ts-watches.
 */

import { toDateKey } from '../engines/WorkoutStats.ts';
import { normalizeSport } from './sportMap.ts';
import type { ImportParseResult, ImportedActivity } from './types.ts';

export interface FitSessionLike {
  start_time?: Date | string | number;
  timestamp?: Date | string | number;
  total_elapsed_time?: number;
  total_timer_time?: number;
  total_distance?: number;
  total_calories?: number;
  avg_heart_rate?: number;
  max_heart_rate?: number;
  sport?: string | number;
  sub_sport?: string | number;
  name?: string;
}

function toMs(v: Date | string | number | undefined): number | null {
  if (v == null) return null;
  if (v instanceof Date) return v.getTime();
  if (typeof v === 'number') return v > 1e12 ? v : v * 1000;
  const ms = Date.parse(String(v));
  return Number.isFinite(ms) ? ms : null;
}

function sportFromFit(session: FitSessionLike): string {
  if (typeof session.sport === 'string') return session.sport;
  if (typeof session.sub_sport === 'string') return session.sub_sport;
  const n = typeof session.sport === 'number' ? session.sport : -1;
  const map: Record<number, string> = {
    0: 'other',
    1: 'running',
    2: 'cycling',
    5: 'swimming',
    10: 'walking',
    11: 'cycling',
    15: 'strength',
    17: 'hiking',
  };
  return map[n] ?? 'other';
}

export function activitiesFromFitSessions(
  sessions: FitSessionLike[],
  opts: { idFactory: () => string; sourceFileName?: string },
): ImportParseResult {
  const warnings: string[] = [];
  const activities: ImportedActivity[] = [];

  for (const s of sessions) {
    const startMs = toMs(s.start_time) ?? toMs(s.timestamp);
    if (startMs == null) {
      warnings.push('FIT: сессия без start_time');
      continue;
    }
    const duration = s.total_timer_time ?? s.total_elapsed_time ?? 0;
    const durationSec = Number.isFinite(duration) ? Math.round(duration) : 0;

    activities.push({
      id: opts.idFactory(),
      source: 'fit',
      sourceFileName: opts.sourceFileName,
      dateKey: toDateKey(new Date(startMs)),
      startedAtMs: startMs,
      durationSec,
      sport: normalizeSport(sportFromFit(s)),
      distanceM:
        s.total_distance != null && Number.isFinite(s.total_distance)
          ? Math.round(s.total_distance)
          : undefined,
      caloriesKcal:
        s.total_calories != null && Number.isFinite(s.total_calories)
          ? Math.round(s.total_calories)
          : undefined,
      avgHr: s.avg_heart_rate,
      maxHr: s.max_heart_rate,
      name: s.name ?? opts.sourceFileName ?? 'FIT',
    });
  }

  if (activities.length === 0 && warnings.length === 0) {
    warnings.push('FIT: нет session-сообщений');
  }

  return { activities, warnings };
}
