import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { patternVolumeStats, pushPullBalance } from "./PatternStats.ts";
import type { SetLogEntry } from "./WorkoutStats.ts";

function log(exerciseId: number, dateKey: string, weight: number, reps: number): SetLogEntry {
  return {
    id: exerciseId + "-" + dateKey + "-" + weight + "-" + reps,
    exerciseId,
    dateKey,
    weight,
    reps,
    rir: 0,
  };
}

const day = (n: number): string => "2026-10-" + String(n).padStart(2, "0");
const NOW = new Date("2026-10-23T12:00:00Z");

describe("patternVolumeStats", () => {
  it("counts working sets per pattern", () => {
    const stats = patternVolumeStats(
      [
        log(4, day(22), 60, 6),
        log(4, day(22), 62.5, 5),
        log(4, day(23), 60, 6),
        log(11, day(23), 0, 8),
      ],
      { 4: "push_horizontal", 11: "pull_vertical" },
      NOW,
    );
    assert.equal(stats.length, 2);
    const push = stats.find((s) => s.pattern === "push_horizontal")!;
    assert.equal(push.weeklySets, 3);
    assert.equal(push.sessionDays, 2);
    assert.equal(push.volumeKg, 60 * 6 + 62.5 * 5 + 60 * 6);
    const pull = stats.find((s) => s.pattern === "pull_vertical")!;
    assert.equal(pull.weeklySets, 1);
    assert.equal(pull.volumeKg, 0);
  });

  it("only counts sets inside the window", () => {
    const stats = patternVolumeStats(
      [log(1, day(1), 80, 8), log(1, day(22), 80, 8)],
      { 1: "squat" },
      NOW,
    );
    assert.equal(stats.length, 1);
    assert.equal(stats[0]!.weeklySets, 1);
    assert.equal(stats[0]!.sessionDays, 1);
  });

  it("excludes explicit warmup sets", () => {
    const warmup: SetLogEntry = { ...log(4, day(22), 40, 8), setType: "warmup" };
    const stats = patternVolumeStats(
      [log(4, day(22), 60, 6), warmup],
      { 4: "push_horizontal" },
      NOW,
    );
    assert.equal(stats[0]!.weeklySets, 1);
    assert.equal(stats[0]!.volumeKg, 360);
  });

  it("skips exercises without a pattern mapping", () => {
    assert.equal(patternVolumeStats([log(99, day(22), 50, 8)], {}, NOW).length, 0);
    assert.equal(patternVolumeStats([log(99, day(22), 50, 8)], { 99: "" }, NOW).length, 0);
  });

  it("skips invalid logs", () => {
    assert.equal(patternVolumeStats([log(1, day(22), 60, 0)], { 1: "squat" }, NOW).length, 0);
    assert.equal(patternVolumeStats([log(1, day(22), -5, 8)], { 1: "squat" }, NOW).length, 0);
  });

  it("sorts by weekly sets descending, ties alphabetically", () => {
    const logs = [
      ...Array.from({ length: 3 }, (_, i) => log(9, day(22), 30, 10 + i)),
      ...Array.from({ length: 3 }, (_, i) => log(15, day(22), 0, 40 + i)),
      ...Array.from({ length: 6 }, (_, i) => log(4, day(22), 60, 6 + i)),
    ];
    const stats = patternVolumeStats(
      logs,
      { 9: "isolation", 15: "core", 4: "push_horizontal" },
      NOW,
    );
    assert.deepEqual(stats.map((s) => s.pattern), ["push_horizontal", "core", "isolation"]);
  });
});

describe("pushPullBalance", () => {
  const statsOf = (entries: Array<[string, number]>): ReturnType<typeof patternVolumeStats> =>
    entries.map(([pattern, weeklySets]) => ({ pattern, weeklySets, volumeKg: 0, sessionDays: 1 }));

  it("reports none when there are no push or pull sets", () => {
    const balance = pushPullBalance(statsOf([["squat", 6], ["hinge", 4]]));
    assert.equal(balance.pushSets, 0);
    assert.equal(balance.pullSets, 0);
    assert.equal(balance.ratio, null);
    assert.equal(balance.status, "none");
  });

  it("classifies a balanced week", () => {
    const balance = pushPullBalance(
      statsOf([
        ["push_horizontal", 6],
        ["push_vertical", 2],
        ["pull_horizontal", 4],
        ["pull_vertical", 2],
      ]),
    );
    assert.equal(balance.pushSets, 8);
    assert.equal(balance.pullSets, 6);
    assert.equal(balance.status, "balanced");
  });

  it("flags a push-heavy week", () => {
    const balance = pushPullBalance(
      statsOf([
        ["push_horizontal", 10],
        ["push_vertical", 4],
        ["pull_vertical", 3],
      ]),
    );
    assert.equal(balance.status, "push_heavy");
  });

  it("flags a pull-heavy week", () => {
    const balance = pushPullBalance(statsOf([["push_vertical", 2], ["pull_horizontal", 9]]));
    assert.equal(balance.status, "pull_heavy");
  });

  it("flags weeks with zero pulls as push-heavy", () => {
    const balance = pushPullBalance(statsOf([["push_horizontal", 5], ["squat", 12]]));
    assert.equal(balance.pushSets, 5);
    assert.equal(balance.pullSets, 0);
    assert.equal(balance.status, "push_heavy");
  });
});
