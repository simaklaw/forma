import { toDateKey } from '../engines/WorkoutStats.ts';
import { normalizeSport } from './sportMap.ts';
import type { ImportParseResult, ImportedActivity } from './types.ts';

function attr(xml: string, name: string): string | undefined {
  const re = new RegExp(name + '="([^"]+)"', 'i');
  return xml.match(re)?.[1];
}

function tagText(xml: string, tag: string): string | undefined {
  const re = new RegExp('<' + tag + '[^>]*>([^<]*)</' + tag + '>', 'i');
  return xml.match(re)?.[1]?.trim();
}

function allBlocks(xml: string, tag: string): string[] {
  const re = new RegExp('<' + tag + '\\b[^>]*>[\\s\\S]*?</' + tag + '>', 'gi');
  return xml.match(re) ?? [];
}

/** Minimal TCX (Training Center XML) activity import. */
export function parseTcx(
  xml: string,
  opts: { idFactory: () => string; sourceFileName?: string },
): ImportParseResult {
  const warnings: string[] = [];
  const activities = allBlocks(xml, 'Activity');
  if (activities.length === 0) {
    const laps = allBlocks(xml, 'Lap');
    if (laps.length === 0) {
      return { activities: [], warnings: ['TCX: нет Activity/Lap'] };
    }
  }

  const result: ImportedActivity[] = [];
  const blocks = activities.length > 0 ? activities : [xml];

  for (const block of blocks) {
    const sportAttr = attr(block, 'Sport');
    const lapOpenMatch = block.match(new RegExp('<Lap\\b[^>]*>', 'i'));
    const lapOpen = lapOpenMatch?.[0] ?? '';
    const startText =
      tagText(block, 'Id') ??
      attr(lapOpen, 'StartTime') ??
      tagText(block, 'StartTime');
    if (!startText) {
      warnings.push('TCX: пропущен блок без времени старта');
      continue;
    }
    const startMs = Date.parse(startText);
    if (!Number.isFinite(startMs)) {
      warnings.push('TCX: плохое время «' + startText + '»');
      continue;
    }

    const totalTime = Number(tagText(block, 'TotalTimeSeconds') ?? '0');
    const distanceM = Number(tagText(block, 'DistanceMeters') ?? '');
    const calories = Number(tagText(block, 'Calories') ?? '');
    const avgHrBlock = block.match(
      new RegExp('<AverageHeartRateBpm[^>]*>[\\s\\S]*?<Value>(\\d+)', 'i'),
    );
    const maxHrBlock = block.match(
      new RegExp('<MaximumHeartRateBpm[^>]*>[\\s\\S]*?<Value>(\\d+)', 'i'),
    );

    result.push({
      id: opts.idFactory(),
      source: 'tcx',
      sourceFileName: opts.sourceFileName,
      dateKey: toDateKey(new Date(startMs)),
      startedAtMs: startMs,
      durationSec: Number.isFinite(totalTime) && totalTime > 0 ? Math.round(totalTime) : 0,
      sport: normalizeSport(sportAttr),
      distanceM: Number.isFinite(distanceM) && distanceM > 0 ? Math.round(distanceM) : undefined,
      caloriesKcal: Number.isFinite(calories) && calories > 0 ? Math.round(calories) : undefined,
      avgHr: avgHrBlock ? Number(avgHrBlock[1]) : undefined,
      maxHr: maxHrBlock ? Number(maxHrBlock[1]) : undefined,
      name: sportAttr ?? opts.sourceFileName ?? 'TCX',
    });
  }

  return { activities: result, warnings };
}
