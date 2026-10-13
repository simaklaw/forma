import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseTcx } from './parseTcx.ts';

const SAMPLE = `<?xml version="1.0"?>
<TrainingCenterDatabase>
  <Activities>
    <Activity Sport="Running">
      <Id>2026-04-10T06:15:00Z</Id>
      <Lap StartTime="2026-04-10T06:15:00Z">
        <TotalTimeSeconds>2400</TotalTimeSeconds>
        <DistanceMeters>8000</DistanceMeters>
        <Calories>520</Calories>
        <AverageHeartRateBpm><Value>148</Value></AverageHeartRateBpm>
        <MaximumHeartRateBpm><Value>172</Value></MaximumHeartRateBpm>
      </Lap>
    </Activity>
  </Activities>
</TrainingCenterDatabase>`;

describe('parseTcx', () => {
  it('maps activity fields', () => {
    let n = 0;
    const r = parseTcx(SAMPLE, { idFactory: () => `tcx-${++n}` });
    assert.equal(r.activities.length, 1);
    const a = r.activities[0];
    assert.equal(a.sport, 'running');
    assert.equal(a.dateKey, '2026-04-10');
    assert.equal(a.durationSec, 2400);
    assert.equal(a.distanceM, 8000);
    assert.equal(a.caloriesKcal, 520);
    assert.equal(a.avgHr, 148);
    assert.equal(a.maxHr, 172);
  });
});
