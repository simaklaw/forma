import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatSetAmount,
  isTimedMeasure,
  measureStep,
  resolveSetMeasure,
  stepSetAmount,
} from "./SetMeasure.ts";

describe("resolveSetMeasure", () => {
  it("defaults to reps for missing values", () => {
    assert.equal(resolveSetMeasure(undefined), "reps");
    assert.equal(resolveSetMeasure(null), "reps");
  });

  it("keeps declared measures", () => {
    assert.equal(resolveSetMeasure("seconds"), "seconds");
    assert.equal(resolveSetMeasure("reps"), "reps");
  });

  it("falls back to reps for unknown values", () => {
    assert.equal(resolveSetMeasure("minutes"), "reps");
    assert.equal(resolveSetMeasure(42), "reps");
  });
});

describe("measureStep", () => {
  it("uses 1 for reps and 5 for seconds", () => {
    assert.equal(measureStep("reps"), 1);
    assert.equal(measureStep("seconds"), 5);
  });
});

describe("stepSetAmount", () => {
  it("steps reps by one and clamps at 1", () => {
    assert.equal(stepSetAmount("reps", 12, -1), 11);
    assert.equal(stepSetAmount("reps", 1, -1), 1);
    assert.equal(stepSetAmount("reps", 12, 1), 13);
  });

  it("steps seconds by five and snaps odd amounts", () => {
    assert.equal(stepSetAmount("seconds", 40, -1), 35);
    assert.equal(stepSetAmount("seconds", 40, 1), 45);
    assert.equal(stepSetAmount("seconds", 43, -1), 40);
    assert.equal(stepSetAmount("seconds", 43, 1), 50);
    assert.equal(stepSetAmount("seconds", 3, -1), 5);
  });
});

describe("formatSetAmount", () => {
  const units = { reps: "", seconds: "s" };

  it("renders a bare number for reps", () => {
    assert.equal(formatSetAmount("reps", 12, units), "12");
  });

  it("appends the seconds unit for timed sets", () => {
    assert.equal(formatSetAmount("seconds", 40, units), "40s");
  });

  it("renders non-finite amounts as zero", () => {
    assert.equal(formatSetAmount("seconds", Number.NaN, units), "0s");
  });
});

describe("isTimedMeasure", () => {
  it("is true only for seconds", () => {
    assert.equal(isTimedMeasure("seconds"), true);
    assert.equal(isTimedMeasure("reps"), false);
  });
});
