import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  circularStats,
  detectAnomalies,
  linearRegression,
  mean,
  median,
  percentile,
  standardDeviation,
  trendDirection,
} from "./StatsUtils.ts";

describe("percentile", () => {
  it("interpolates between observations", () => {
    assert.equal(percentile([1, 2, 3, 4, 5], 50), 3);
    assert.equal(percentile([1, 2, 3, 4], 25), 1.75);
    assert.equal(percentile([10, 20, 30, 40, 50, 60, 70, 80, 90, 100], 90), 91);
  });

  it("handles min and max", () => {
    assert.equal(percentile([7, 3], 0), 3);
    assert.equal(percentile([7, 3], 100), 7);
  });

  it("throws on empty input, bad percent or NaN observations", () => {
    assert.throws(() => percentile([], 50));
    assert.throws(() => percentile([1, 2], 150));
    assert.throws(() => percentile([1, Number.NaN], 50));
  });
});

describe("mean, median, standardDeviation", () => {
  it("computes basic statistics", () => {
    const values = [2, 4, 4, 4, 5, 5, 7, 9];
    assert.equal(mean(values), 5);
    assert.equal(median(values), 4.5);
    assert.equal(standardDeviation(values), 2);
  });

  it("standard deviation is 0 for a single value or a constant array", () => {
    assert.equal(standardDeviation([42]), 0);
    assert.equal(standardDeviation([5, 5, 5]), 0);
  });
});

describe("linearRegression", () => {
  it("fits a perfect line", () => {
    const { slope, r2 } = linearRegression([1, 2, 3, 4, 5]);
    assert.equal(slope, 1);
    assert.equal(r2, 1);
  });

  it("returns zero slope and R2 for constant values", () => {
    assert.deepEqual(linearRegression([5, 5, 5, 5]), { slope: 0, r2: 0 });
  });

  it("gives low R2 for alternating noise", () => {
    const { r2 } = linearRegression([50, 80, 50, 80, 50, 80]);
    assert.ok(r2 < 0.4);
  });
});

describe("detectAnomalies", () => {
  it("flags values beyond the sigma threshold", () => {
    const anomalies = detectAnomalies([0, 0, 0, 0, 0, 30]);
    assert.equal(anomalies.length, 1);
    assert.equal(anomalies[0]!.index, 5);
    assert.equal(anomalies[0]!.value, 30);
    assert.ok(Math.abs(anomalies[0]!.deviation - 2.23606797749979) < 1e-9);
  });

  it("returns no anomalies for constant values", () => {
    assert.deepEqual(detectAnomalies([5, 5, 5]), []);
  });

  it("throws on empty input", () => {
    assert.throws(() => detectAnomalies([]));
  });
});

describe("trendDirection", () => {
  it("classifies by slope when R2 is sufficient", () => {
    assert.equal(trendDirection(5, 1), "improving");
    assert.equal(trendDirection(-2, 0.8), "declining");
  });

  it("is stable when R2 is low or the slope is near zero", () => {
    assert.equal(trendDirection(100, 0.4), "stable");
    assert.equal(trendDirection(0.0005, 0.9), "stable");
  });
});

describe("circularStats", () => {
  it("averages clock times across midnight", () => {
    const { mean: avg, sd } = circularStats([1320, 30]); // 22:00 и 00:30
    assert.equal(avg, 1395); // 23:15
    assert.ok(Math.abs(sd - 75.68594687960378) < 1e-9);
  });

  it("returns nulls for empty input", () => {
    assert.deepEqual(circularStats([]), { mean: null, sd: null });
  });
});
