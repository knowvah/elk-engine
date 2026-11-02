// SPDX-License-Identifier: EPL-2.0
// Tests of the placement comparer: equal dumps, a fake P4 phase that moves nodes below and above the AD-4 tolerance,
// the N3 presence rule for ports and labels, and each missing/unexpected kind.
import { beforeAll, describe, expect, it } from 'vitest';
import type { LGraph } from '../../src/alg/layered/graph/LGraph.js';
import type { LNode } from '../../src/alg/layered/graph/LNode.js';
import type { ILayoutProcessor } from '../../src/core/alg/ILayoutProcessor.js';
import { LayoutMetaDataService } from '../../src/core/data/LayoutMetaDataService.js';
import { dumpLGraph, encodeHex } from './layered-framework-replay.js';
import { elementAt, importDumpOf } from './layered-phase-replay-dump.js';
import { importRow } from './layered-phase-replay-rows.js';
import type { Factories } from './layered-phase-replay-ops.js';
import { comparePlacement, comparePlacementFullDump } from './layered-placement-replay-compare.js';
import { placementDump } from './layered-placement-replay-dump.js';
import { runPlacementPrefix } from './layered-placement-replay-ops.js';
import { P4_NODE_PLACEMENT, type PlacementExpected, type PlacementRow } from './layered-placement-replay-rows.js';

const GRAPH = {
  id: 'root',
  children: [
    { id: 'a', width: 10, height: 10, labels: [{ text: 'A', width: 4, height: 4 }], ports: [{ id: 'a0' }] },
    { id: 'b', width: 10, height: 10, ports: [{ id: 'b0' }] },
  ],
  edges: [{ id: 'e', sources: ['a0'], targets: ['b0'] }],
};
const PHASE_ROW: PlacementRow = {
  id: 'models/placement-compare',
  group: 'models',
  input: { elk: GRAPH },
  target: null,
  options: {},
  steps: null,
  prefix: [`${P4_NODE_PLACEMENT}/FAKE`],
  expected: {
    layers: [],
    layerless: [],
    hidden: [],
    edges: [],
    changed: [],
    ports: {},
    geometry: { nodes: {}, layers: [] },
  },
};
const A = 'g0/n0';
const B = 'g0/n1';
const BIG_MOVE = 2e-6;
const SMALL_MOVE = 5e-7;

beforeAll(() => {
  LayoutMetaDataService.initElkReflect();
});

type Mutation = (graph: LGraph) => void;

/** Factories whose P4 phase applies `mutation`; the baseline is the dump taken before the prefix runs it. */
function replay(mutation: Mutation): { before: PlacementExpected; after: PlacementExpected; graph: LGraph } {
  const phase = { process: mutation } as unknown as ILayoutProcessor<LGraph>;
  const factories: Factories = { createProcessor: () => phase, createPhase: () => phase };
  const unmoved = importRow(PHASE_ROW);
  const before = placementDump(unmoved.graph, unmoved.importDump);
  const graph = runPlacementPrefix(PHASE_ROW, factories);
  const after = placementDump(graph, importDumpOf(graph));
  return { before, after, graph };
}

const nodeAt = (graph: LGraph, path: string): LNode => elementAt(graph, path) as LNode;

describe('comparePlacement', () => {
  it('reports no difference between equal dumps', () => {
    const { before } = replay(() => undefined);
    expect(comparePlacement(before, before)).toEqual([]);
  });

  it('reports the node a fake P4 moved by 2e-6 and not the one it moved by 5e-7', () => {
    const { before, after } = replay((graph) => {
      nodeAt(graph, A).getPosition().y += BIG_MOVE;
      nodeAt(graph, B).getPosition().y += SMALL_MOVE;
    });
    const diffs = comparePlacement(after, before);
    expect(diffs.map((d) => d.where)).toEqual([`geometry nodes ${A}`]);
    expect(diffs[0]?.message).toContain('.pos[1]');
  });

  it('reports a size and a margin change of a node', () => {
    const { before, after } = replay((graph) => {
      nodeAt(graph, B).getSize().x += 1;
      nodeAt(graph, B).getMargin().left = 1;
    });
    const messages = comparePlacement(after, before).map((d) => d.message);
    expect(messages).toHaveLength(2);
    expect(messages[0]).toContain('.margin[3]');
    expect(messages[1]).toContain('.size[0]');
  });

  it('reports a moved port only when the expected side carries ports', () => {
    const { before, after } = replay((graph) => {
      nodeAt(graph, A).getPorts()[0]!.getPosition().x += BIG_MOVE;
    });
    expect(comparePlacement(after, before).map((d) => d.where)).toEqual([`geometry ports ${A}/p0`]);
    const { ports: _ports, ...withoutPorts } = before.geometry;
    expect(comparePlacement(after, { ...before, geometry: withoutPorts })).toEqual([]);
  });

  it('reports a moved label only when the expected side carries labels', () => {
    const { before, after } = replay((graph) => {
      nodeAt(graph, A).getLabels()[0]!.getPosition().y += BIG_MOVE;
    });
    expect(comparePlacement(after, before).map((d) => d.where)).toEqual([`geometry labels ${A}/l0`]);
    const { labels: _labels, ...withoutLabels } = before.geometry;
    expect(comparePlacement(after, { ...before, geometry: withoutLabels })).toEqual([]);
  });

  it('reports a layer size outside the tolerance and a missing or extra layer by path', () => {
    const { before } = replay(() => undefined);
    const hex = (x: number): [string, string] => [encodeHex(x), encodeHex(0)];
    const two = { ...before, geometry: { ...before.geometry, layers: [hex(1), hex(2)] } };
    const moved = { ...two, geometry: { ...two.geometry, layers: [hex(1), hex(2 + BIG_MOVE)] } };
    const one = { ...before, geometry: { ...before.geometry, layers: [hex(1)] } };
    expect(comparePlacement(moved, two).map((d) => d.where)).toEqual(['geometry layers layer1']);
    expect(comparePlacement(one, two)).toEqual([{ where: 'geometry layers layer1', message: 'missing' }]);
    expect(comparePlacement(two, one)).toEqual([{ where: 'geometry layers layer1', message: 'unexpected' }]);
  });

  it('reports a missing and an unexpected node, port and label by path', () => {
    const { before } = replay(() => undefined);
    const { [B]: node, ...nodes } = before.geometry.nodes;
    const { [`${B}/p0`]: port, ...ports } = before.geometry.ports!;
    const { [`${A}/l0`]: label, ...labels } = before.geometry.labels!;
    expect([node, port, label].every((entry) => entry !== undefined)).toBe(true);
    const fewer = { ...before, geometry: { nodes, layers: before.geometry.layers, ports, labels } };
    const missing = comparePlacement(fewer, before);
    expect(missing).toEqual([
      { where: `geometry nodes ${B}`, message: 'missing' },
      { where: `geometry ports ${B}/p0`, message: 'missing' },
      { where: `geometry labels ${A}/l0`, message: 'missing' },
    ]);
    expect(comparePlacement(before, fewer).map((d) => d.message)).toEqual(['unexpected', 'unexpected', 'unexpected']);
  });

  it('still reports the order members of the 7c comparison', () => {
    const { before } = replay(() => undefined);
    const diffs = comparePlacement({ ...before, layerless: [B, A] }, before);
    expect(diffs.map((d) => d.where)).toEqual(['layerless']);
  });
});

describe('comparePlacementFullDump', () => {
  it('is empty when the row stores no full dump, and compares the dump when it does', () => {
    const { before, graph } = replay(() => undefined);
    const actual = { ...before, dump: dumpLGraph(graph) };
    expect(comparePlacementFullDump(actual, before)).toEqual([]);
    expect(comparePlacementFullDump(actual, actual)).toEqual([]);
    expect(comparePlacementFullDump(before, actual)).toEqual([
      { where: 'dump', message: 'the replay produced no full dump' },
    ]);
  });
});
