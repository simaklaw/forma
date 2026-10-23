import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { personalBaseline, type BaselineObservation } from "./PersonalBaselines.ts";

function obs(day: number, value: number): BaselineObservation {
  return { value, dateKey: `2026-09-${String(day).padStart(2, "0")}` };
}

describe("personalBaseline", () => {
  it("builds a percentile band and excludes the latest observation", () => {
    const observations: BaselineObservation[] = [];
    for (let i = 0; i < 15; i++) {
      observations.push(obs(i + 1, 50 + i * 2));
    }
    observations.push(obs(16, 70)); // последнее наблюдение — вне базлайна
    const result = personalBaseline(observations);
    assert.equal(result.status, "available");
    assert.equal(result.sampleSize, 15);
    assert.equal(result.excluded, 0);
    assert.equal(result.latest, 70);
    const band = result.band!;
    assert.equal(band.sampleSize, 15);
    assert.equal(band.mean, 64);
    assert.equal(band.median, 64);
    assert.ok(Math.abs(band.stdDev - 8.640987597877148) < 1e-9);
    assert.equal(band.p10, 52.8);
    assert.equal(band.p25, 57);
    assert.equal(band.p50, 64);
    assert.equal(band.p75, 71);
    assert.equal(band.p90, 75.2);
    assert.equal(result.latestPercentile, 70);
    assert.equal(result.constantBaseline, false);
  });

  it("is insufficient below the minimum sample size", () => {
    const result = personalBaseline([obs(1, 50), obs(2, 52)], 14);
    assert.equal(result.status, "insufficient_data");
    assert.equal(result.sampleSize, 1);
    assert.equal(result.band, null);
    assert.equal(result.latest, 52);
    assert.equal(result.latestPercentile, null);
  });

  it("excludes invalid values and duplicate dates", () => {
    const observations = [
      obs(1, 50),
      obs(2, 52),
      obs(2, 54), // дубликат даты — остаётся 54
      { value: Number.NaN, dateKey: "2026-09-03" }, // нечисловое значение
      obs(4, 56),
    ];
    const result = personalBaseline(observations);
    assert.equal(result.excluded, 2);
    assert.equal(result.sampleSize, 2); // 3 валидных дня минус последний
    assert.equal(result.status, "insufficient_data");
    assert.equal(result.latest, 56);
  });

  it("detects a constant baseline", () => {
    const observations: BaselineObservation[] = [];
    for (let i = 1; i <= 15; i++) {
      observations.push(obs(i, 60));
    }
    observations.push(obs(16, 60));
    const result = personalBaseline(observations);
    assert.equal(result.status, "available");
    assert.equal(result.constantBaseline, true);
    assert.equal(result.band!.stdDev, 0);
    assert.equal(result.latestPercentile, 50);
  });

  it("handles empty input", () => {
    const result = personalBaseline([]);
    assert.equal(result.status, "insufficient_data");
    assert.equal(result.latest, null);
    assert.equal(result.excluded, 0);
    assert.equal(result.band, null);
  });
});
