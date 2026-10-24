import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildSwapGraph, swapOptions } from "./SwapGraph.ts";

describe("buildSwapGraph", () => {
  it("mirrors harder edges into easier", () => {
    const graph = buildSwapGraph({ 35: { harder: [1] } });
    assert.deepEqual(graph[35], { easier: [], harder: [1] });
    assert.deepEqual(graph[1], { easier: [35], harder: [] });
  });

  it("mirrors easier edges into harder", () => {
    const graph = buildSwapGraph({ 10: { easier: [48] } });
    assert.deepEqual(graph[10], { easier: [48], harder: [] });
    assert.deepEqual(graph[48], { easier: [], harder: [10] });
  });

  it("keeps declaration order for multiple targets", () => {
    const graph = buildSwapGraph({ 15: { harder: [54, 17] } });
    assert.deepEqual(graph[15]!.harder, [54, 17]);
    assert.deepEqual(graph[54]!.easier, [15]);
    assert.deepEqual(graph[17]!.easier, [15]);
  });

  it("dedupes edges declared in both directions", () => {
    const graph = buildSwapGraph({ 20: { harder: [21] }, 21: { easier: [20] } });
    assert.deepEqual(graph[20]!.harder, [21]);
    assert.deepEqual(graph[21]!.easier, [20]);
    assert.equal(graph[20]!.harder.length, 1);
  });

  it("drops self-references", () => {
    const graph = buildSwapGraph({ 7: { harder: [7, 8] } });
    assert.deepEqual(graph[7]!.harder, [8]);
    assert.deepEqual(graph[8]!.easier, [7]);
  });

  it("skips invalid ids (non-integer, non-positive)", () => {
    const graph = buildSwapGraph({ 1: { harder: [0, -3, 2.5, 2] } });
    assert.deepEqual(graph[1]!.harder, [2]);
    assert.equal(graph[0], undefined);
    assert.equal(graph[-3], undefined);
  });

  it("returns an empty graph for empty input", () => {
    assert.deepEqual(buildSwapGraph({}), {});
  });
});

describe("swapOptions", () => {
  const graph = buildSwapGraph({ 35: { harder: [1] } });

  it("returns the graph entry for known ids", () => {
    assert.deepEqual(swapOptions(graph, 35), { easier: [], harder: [1] });
    assert.deepEqual(swapOptions(graph, 1), { easier: [35], harder: [] });
  });

  it("returns empty options for unknown ids", () => {
    assert.deepEqual(swapOptions(graph, 999), { easier: [], harder: [] });
  });
});
