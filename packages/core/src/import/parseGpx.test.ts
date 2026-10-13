import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseGpx } from './parseGpx.ts';

const SAMPLE = `<?xml version="1.0"?>
<gpx>
  <trk>
    <name>Morning run</name>
    <type>running</type>
    <trkseg>
      <trkpt lat="55.75" lon="37.61"><time>2026-03-01T08:00:00Z</time></trkpt>
      <trkpt lat="55.76" lon="37.62"><time>2026-03-01T08:30:00Z</time></trkpt>
    </trkseg>
  </trk>
</gpx>`;

describe('parseGpx', () => {
  it('extracts duration sport and distance', () => {
    let n = 0;
    const r = parseGpx(SAMPLE, { idFactory: () => `gpx-${++n}` });
    assert.equal(r.activities.length, 1);
    const a = r.activities[0];
    assert.equal(a.sport, 'running');
    assert.equal(a.dateKey, '2026-03-01');
    assert.equal(a.durationSec, 1800);
    assert.ok(a.distanceM != null && a.distanceM > 1000);
  });
});
