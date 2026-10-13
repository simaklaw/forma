import { toDateKey } from '../engines/WorkoutStats.ts';
import { normalizeSport } from './sportMap.ts';
import type { ImportParseResult, ImportedActivity } from './types.ts';

function tagText(xml: string, tag: string): string | undefined {
  const re = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'i');
  const m = xml.match(re);
  return m?.[1]?.trim();
}

function allTagTexts(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'gi');
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) != null) {
    if (m[1]?.trim()) out.push(m[1].trim());
  }
  return out;
}

/** Minimal GPX 1.1 activity import (track / trackpoints). Pure string parse — RN-safe. */
export function parseGpx(
  xml: string,
  opts: { idFactory: () => string; sourceFileName?: string },
): ImportParseResult {
  const warnings: string[] = [];
  const name = tagText(xml, 'name');
  const times = allTagTexts(xml, 'time');
  if (times.length === 0) {
    return { activities: [], warnings: ['GPX: нет меток времени'] };
  }

  const startMs = Date.parse(times[0]);
  const endMs = Date.parse(times[times.length - 1]);
  if (!Number.isFinite(startMs)) {
    return { activities: [], warnings: ['GPX: некорректное время старта'] };
  }

  const durationSec =
    Number.isFinite(endMs) && endMs > startMs
      ? Math.round((endMs - startMs) / 1000)
      : 0;

  let distanceM: number | undefined;
  const trkpts = xml.match(/<trkpt\b[^>]*>/gi) ?? [];
  if (trkpts.length >= 2) {
    const coords: { lat: number; lon: number }[] = [];
    for (const p of trkpts) {
      const lat = p.match(/lat="([^"]+)"/i)?.[1];
      const lon = p.match(/lon="([^"]+)"/i)?.[1];
      if (lat && lon) coords.push({ lat: Number(lat), lon: Number(lon) });
    }
    if (coords.length >= 2) {
      distanceM = 0;
      for (let i = 1; i < coords.length; i++) {
        distanceM += haversineM(coords[i - 1], coords[i]);
      }
      distanceM = Math.round(distanceM);
    }
  } else {
    warnings.push('GPX: мало точек трека — дистанция не посчитана');
  }

  const typeText = tagText(xml, 'type') ?? name;
  const activity: ImportedActivity = {
    id: opts.idFactory(),
    source: 'gpx',
    sourceFileName: opts.sourceFileName,
    dateKey: toDateKey(new Date(startMs)),
    startedAtMs: startMs,
    durationSec,
    sport: normalizeSport(typeText),
    distanceM,
    name: name ?? opts.sourceFileName ?? 'GPX',
  };

  return { activities: [activity], warnings };
}

function haversineM(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}
