import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_MEV, DEFAULT_MRV, muscleVolumeStats } from "./MuscleVolumeStats.ts";
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

describe("muscleVolumeStats", () => {
  it("counts the primary muscle in full and synergists at half weight", () => {
    const stats = muscleVolumeStats(
      [
        log(1, day(22), 60, 8),
        log(1, day(22), 62.5, 6),
        log(1, day(23), 60, 7),
        log(1, day(23), 55, 10),
      ],
      { 1: ["chest", "shoulders", "triceps"] },
      NOW,
    );
    assert.equal(stats.length, 3);
    const chest = stats.find((s) => s.muscle === "chest")!;
    assert.equal(chest.weeklySets, 4);
    assert.equal(chest.directSets, 4);
    assert.equal(chest.sessionDays, 2);
    assert.equal(stats.find((s) => s.muscle === "shoulders")!.weeklySets, 2);
    assert.equal(stats.find((s) => s.muscle === "triceps")!.weeklySets, 2);
    assert.ok(stats.every((s) => s.directSets === 0 || s.muscle === "chest"));
  });

  it("only counts sets inside the window", () => {
    const stats = muscleVolumeStats(
      [log(2, day(1), 100, 8), log(2, day(22), 90, 8)],
      { 2: ["back"] },
      NOW,
    );
    const back = stats.find((s) => s.muscle === "back")!;
    assert.equal(back.weeklySets, 1);
    assert.equal(back.sessionDays, 1);
  });

  it("counts bodyweight sets as volume-free load", () => {
    const stats = muscleVolumeStats([log(3, day(22), 0, 15)], { 3: ["core"] }, NOW);
    const core = stats.find((s) => s.muscle === "core")!;
    assert.equal(core.weeklySets, 1);
    assert.equal(core.volumeKg, 0);
  });

  it("classifies under MEV, optimal and junk volume", () => {
    const many: SetLogEntry[] = Array.from({ length: 6 }, (_, i) => log(4, day(22), 60, 8 + i));
    const tooMany: SetLogEntry[] = Array.from({ length: 9 }, (_, i) => log(5, day(22), 40, 12 + i));
    const few: SetLogEntry[] = Array.from({ length: 4 }, (_, i) => log(6, day(22), 30, 10 + i));
    const stats = muscleVolumeStats([...many, ...tooMany, ...few], {
      4: ["chest"],
      5: ["back"],
      6: ["biceps"],
    }, NOW, 7, 5, 8);
    assert.equal(stats.find((s) => s.muscle === "chest")!.status, "optimal");
    assert.equal(stats.find((s) => s.muscle === "back")!.status, "junk");
    assert.equal(stats.find((s) => s.muscle === "biceps")!.status, "under");
    assert.ok(stats.every((s) => s.mev === 5 && s.mrv === 8));
  });

  it("flags junk volume above the default MRV", () => {
    const many: SetLogEntry[] = Array.from({ length: 21 }, (_, i) => log(7, day(22), 50, 8 + (i % 3)));
    const stats = muscleVolumeStats(many, { 7: ["chest"] }, NOW);
    assert.equal(stats[0]!.weeklySets, 21);
    assert.equal(stats[0]!.status, "junk");
    assert.equal(stats[0]!.mev, DEFAULT_MEV);
    assert.equal(stats[0]!.mrv, DEFAULT_MRV);
  });

  it("skips exercises without a muscle mapping", () => {
    assert.equal(muscleVolumeStats([log(8, day(22), 60, 8)], {}, NOW).length, 0);
    assert.equal(
      muscleVolumeStats([log(9, day(22), 60, 8)], { 9: [] }, NOW).length,
      0,
    );
  });

  it("skips invalid logs", () => {
    assert.equal(muscleVolumeStats([log(10, day(22), 60, 0)], { 10: ["chest"] }, NOW).length, 0);
    assert.equal(muscleVolumeStats([log(11, day(22), -5, 8)], { 11: ["chest"] }, NOW).length, 0);
  });

  it("sums tonnage per muscle", () => {
    const stats = muscleVolumeStats(
      [log(12, day(22), 60, 8), log(12, day(22), 62.5, 6)],
      { 12: ["quads"] },
      NOW,
    );
    assert.equal(stats[0]!.volumeKg, 855);
  });

  it("sorts by weekly sets descending", () => {
    const logs = [
      ...Array.from({ length: 3 }, (_, i) => log(13, day(22), 20, 12 + i)),
      ...Array.from({ length: 6 }, (_, i) => log(14, day(22), 40, 10 + i)),
    ];
    const stats = muscleVolumeStats(logs, { 13: ["biceps"], 14: ["chest"] }, NOW);
    assert.deepEqual(stats.map((s) => s.muscle), ["chest", "biceps"]);
  });

  it("keeps half-step weights for pure synergists", () => {
    const logs = Array.from({ length: 3 }, (_, i) => log(15, day(22), 50, 10 + i));
    const stats = muscleVolumeStats(logs, { 15: ["back", "biceps"] }, NOW);
    assert.equal(stats.find((s) => s.muscle === "biceps")!.weeklySets, 1.5);
    assert.equal(stats.find((s) => s.muscle === "biceps")!.directSets, 0);
  });

  it("excludes explicit warmup sets from weekly volume", () => {
    const warmup: SetLogEntry = { ...log(16, day(22), 100, 8), setType: "warmup" };
    const stats = muscleVolumeStats([log(16, day(22), 60, 8), warmup], { 16: ["chest"] }, NOW);
    const chest = stats.find((s) => s.muscle === "chest")!;
    assert.equal(chest.weeklySets, 1);
    assert.equal(chest.volumeKg, 480);
  });
});
