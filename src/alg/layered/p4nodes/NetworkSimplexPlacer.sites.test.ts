// SPDX-License-Identifier: EPL-2.0
// Anchored site cases of NetworkSimplexPlacer (mission 7d, T12a, N11): one case per recorded `sites/NetworkSimplex/*`
// row, asserting the field the branch decides with a literal copied from the row (the generic replay in
// NetworkSimplexPlacer.test.ts already compares the whole row).
// Expectations come only from the rows and the Java (L4).
import { beforeAll, describe, expect, it } from 'vitest';
import { repoRoot } from '../../../../test/corpus/corpus.js';
import { decodeHex } from '../../../../test/helpers/layered-framework-replay.js';
import { runSteps, type Factories } from '../../../../test/helpers/layered-phase-replay-ops.js';
import { importRow } from '../../../../test/helpers/layered-phase-replay-rows.js';
import { placementDump } from '../../../../test/helpers/layered-placement-replay-dump.js';
import { loadPlacementRows } from '../../../../test/helpers/layered-placement-replay-rows.js';
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import { LayoutMetaDataService } from '../../../core/data/LayoutMetaDataService.js';
import { LGraph } from '../graph/LGraph.js';
import { HierarchicalPortDummySizeProcessor } from '../intermediate/HierarchicalPortDummySizeProcessor.js';
import { InLayerConstraintProcessor } from '../intermediate/InLayerConstraintProcessor.js';
import { InnermostNodeMarginCalculator } from '../intermediate/InnermostNodeMarginCalculator.js';
import { IntermediateProcessorStrategy } from '../intermediate/IntermediateProcessorStrategy.js';
import { LabelAndNodeSizeProcessor } from '../intermediate/LabelAndNodeSizeProcessor.js';
import { CrossingMinimizationStrategy } from '../options/CrossingMinimizationStrategy.js';
import { CycleBreakingStrategy } from '../options/CycleBreakingStrategy.js';
import { LayeringStrategy } from '../options/LayeringStrategy.js';
import { NetworkSimplexPlacer } from './NetworkSimplexPlacer.js';

const ROWS_FILE = `${repoRoot()}/test/golden/refs/java/layered-placement.json`;

const factories: Factories = {
  createProcessor(name): ILayoutProcessor<LGraph> {
    switch (name) {
      case 'INNERMOST_NODE_MARGIN_CALCULATOR':
        return new InnermostNodeMarginCalculator();
      case 'LABEL_AND_NODE_SIZE_PROCESSOR':
        return new LabelAndNodeSizeProcessor();
      case 'IN_LAYER_CONSTRAINT_PROCESSOR':
        return new InLayerConstraintProcessor();
      case 'HIERARCHICAL_PORT_DUMMY_SIZE_PROCESSOR':
        return new HierarchicalPortDummySizeProcessor();
      default:
        return IntermediateProcessorStrategy.valueOf(name).create();
    }
  },
  createPhase(phase, strategy) {
    switch (phase) {
      case 'P1_CYCLE_BREAKING':
        return CycleBreakingStrategy.valueOf(strategy).create();
      case 'P2_LAYERING':
        return LayeringStrategy.valueOf(strategy).create();
      case 'P3_NODE_ORDERING':
        return CrossingMinimizationStrategy.valueOf(strategy).create();
      default:
        return new NetworkSimplexPlacer();
    }
  },
};

const rows = loadPlacementRows(ROWS_FILE).filter((row) => row.id.startsWith('sites/NetworkSimplex/'));

beforeAll(() => {
  LayoutMetaDataService.initElkReflect();
});

type Point = readonly [number, number];
type Points = Readonly<Record<string, Point>>;

/** The placement dump of a replayed site row, its coordinates decoded. */
function replaySite(id: string): { pos: Points; size: Points; ports: Points; labels: Points } {
  const row = rows.find((candidate) => candidate.id === id)!;
  const { geometry } = placementDump(runSteps(row, factories), importRow(row).importDump);
  const decode = (pair: readonly [string, string]): Point => [decodeHex(pair[0]), decodeHex(pair[1])];
  const mapOf = <T>(source: Readonly<Record<string, T>> | undefined, pick: (value: T) => readonly [string, string]) =>
    Object.fromEntries(Object.entries(source ?? {}).map(([path, value]) => [path, decode(pick(value))]));
  return {
    pos: mapOf(geometry.nodes, (n) => n.pos),
    size: mapOf(geometry.nodes, (n) => n.size),
    ports: mapOf(geometry.ports, (p) => p.pos),
    labels: mapOf(geometry.labels, (l) => l.pos),
  };
}

function expectPoints(actual: Points, expected: Points): void {
  expect(Object.keys(actual).sort()).toEqual(Object.keys(expected).sort());
  Object.entries(expected).forEach(([path, [x, y]]) => {
    expect(actual[path]![0], `${path}.x`).toBeCloseTo(x, 6);
    expect(actual[path]![1], `${path}.y`).toBeCloseTo(y, 6);
  });
}

/** Compares the y of every node: the placer decides y only, x is the layer's (and differs between rows). */
function expectYs(actual: Points, expected: Readonly<Record<string, number>>): void {
  expect(Object.keys(actual).sort()).toEqual(Object.keys(expected).sort());
  Object.entries(expected).forEach(([path, y]) => {
    expect(actual[path]![1], `${path}.y`).toBeCloseTo(y, 6);
  });
}

describe('NetworkSimplexPlacer (anchored site cases)', () => {
  // oracle: sites/NetworkSimplex/fractionalAnchor; NetworkSimplexPlacer.java:327-335 (anchorMustBeInteger)
  it('places the ports of a flexible node whose port anchor is fractional (S6)', () => {
    const site = replaySite('sites/NetworkSimplex/fractionalAnchor');
    expectPoints(site.ports, {
      'g0/n0/p1': [40, 37],
      'g0/n0/p0': [40, 79],
      'g0/n1/p2': [40, 16],
      'g0/n1/p0': [-4, 16],
      'g0/n1/p1': [-4, 0],
      'g0/n2/p0': [-4, 28],
    });
    expectPoints(site.size, { 'g0/n0': [40, 120], 'g0/n1': [40, 20], 'g0/n2': [40, 60] });
  });

  // oracle: sites/NetworkSimplex/flexibleLabels/{bottom,center,top}; NetworkSimplexPlacer.java:748-783
  it.each([
    // oracle: sites/NetworkSimplex/flexibleLabels/bottom; NetworkSimplexPlacer.java:748-783 (V_BOTTOM moves the label down)
    ['sites/NetworkSimplex/flexibleLabels/bottom', 31],
    // oracle: sites/NetworkSimplex/flexibleLabels/center; NetworkSimplexPlacer.java:748-783 (V_CENTER)
    ['sites/NetworkSimplex/flexibleLabels/center', 18],
    // oracle: sites/NetworkSimplex/flexibleLabels/top; NetworkSimplexPlacer.java:748-783 (V_TOP, no adjustment)
    ['sites/NetworkSimplex/flexibleLabels/top', 5],
  ] as const)('adjusts the node label of a grown flexible node (S7): %s', (id, labelY) => {
    const site = replaySite(id);
    expectPoints(site.labels, { 'g0/n1/l0': [5, labelY] });
    expectPoints(
      { 'g0/n1': site.size['g0/n1']!, 'g0/n1/p3': site.ports['g0/n1/p3']!, 'g0/n1/p4': site.ports['g0/n1/p4']! },
      { 'g0/n1': [40, 46], 'g0/n1/p3': [18, -4], 'g0/n1/p4': [18, 46] },
    );
  });

  // oracle: sites/NetworkSimplex/inLayerEdges; NetworkSimplexPlacer.java:600-640 (dummies above and below their node)
  it('aligns the in-layer dummies of inverted ports with their node (S8)', () => {
    expectYs(replaySite('sites/NetworkSimplex/inLayerEdges').pos, {
      'g0/n3': 0,
      'g0/n0': 50,
      'new/n0': 15,
      'g0/n1': 25,
      'new/n1': 116,
      'g0/n2': 51,
      'g0/n4': 101,
    });
  });

  // oracle: sites/NetworkSimplex/inLayerEdges/westOutput; NetworkSimplexPlacer.java:1338 (closeEdge, no open edge)
  it('straightens a path through a west output port (S8 westOutput)', () => {
    expectYs(replaySite('sites/NetworkSimplex/inLayerEdges/westOutput').pos, { 'g0/n0': 0, 'g0/n1': 6, 'g0/n2': 12 });
  });

  // oracle: sites/NetworkSimplex/flexiblePorts/unconnected; NetworkSimplexPlacer.java:560-575 (no dummy for an edgeless port)
  it('places the ports of a flexible node with an unconnected port (S9 unconnected)', () => {
    const site = replaySite('sites/NetworkSimplex/flexiblePorts/unconnected');
    expectPoints(site.ports, {
      'g0/n0/p0': [40, 58],
      'g0/n1/p3': [18, -4],
      'g0/n1/p2': [40, 0],
      'g0/n1/p1': [40, 16],
      'g0/n1/p4': [18, 20],
      'g0/n1/p0': [-4, 16],
      'g0/n2/p0': [-4, 28],
    });
    expectYs(site.pos, { 'g0/n0': 0, 'g0/n1': 42, 'g0/n2': 30 });
  });

  // oracle: sites/NetworkSimplex/flexiblePorts/overflow; NetworkSimplexPlacer.java:894-925 (isFlexibleNode, west check)
  it('keeps a node whose west ports overflow its height inflexible (S9 overflow)', () => {
    const site = replaySite('sites/NetworkSimplex/flexiblePorts/overflow');
    expectPoints(site.ports, {
      'g0/n0/p3': [40, 21],
      'g0/n0/p0': [40, 46],
      'g0/n0/p1': [40, 70],
      'g0/n0/p2': [40, 95],
      'g0/n1/p4': [40, 8],
      'g0/n1/p2': [-4, 15],
      'g0/n1/p1': [-4, 10],
      'g0/n1/p0': [-4, 6],
      'g0/n1/p3': [-4, 1],
      'g0/n2/p0': [-4, 28],
    });
    expectYs(site.pos, { 'g0/n0': 20, 'g0/n1': 80, 'g0/n2': 60 });
  });

  // oracle: sites/NetworkSimplex/flexiblePorts/junctionPath; NetworkSimplexPlacer.java:974-985 (containsFlexibleNode)
  it('places a long path that starts at a flexible junction node (S9 junctionPath)', () => {
    const site = replaySite('sites/NetworkSimplex/flexiblePorts/junctionPath');
    expectYs(site.pos, { 'g0/n0': 0, 'g0/n1': 15, 'g0/n2': 0, 'g0/n3': 50, 'g0/n4': 50, 'g0/n5': 50 });
    expectPoints(site.ports, {
      'g0/n0/p0': [30, 15],
      'g0/n1/p1': [30, 0],
      'g0/n1/p2': [30, 50],
      'g0/n1/p0': [0, 0],
      'g0/n2/p0': [0, 15],
      'g0/n3/p1': [30, 15],
      'g0/n3/p0': [0, 15],
      'g0/n4/p1': [30, 15],
      'g0/n4/p0': [0, 15],
      'g0/n5/p0': [0, 15],
    });
  });

  // oracle: sites/NetworkSimplex/twoPaths/crossingLeftEnd; NetworkSimplexPlacer.java:990-998,1248-1265 (orderTwoPath, follow)
  it('orders a two-path whose left end is cut by a crossing edge (S10)', () => {
    expectYs(replaySite('sites/NetworkSimplex/twoPaths/crossingLeftEnd').pos, {
      'g0/n0': 7,
      'g0/n1': 57,
      'g0/n2': 7,
      'g0/n3': 57,
      'g0/n4': 107,
      'g0/n5': 157,
      'g0/n6': 107,
    });
  });

  // oracle: sites/NetworkSimplex/twoPaths/crossingLeftEnd/longEdge; NetworkSimplexPlacer.java:1035-1050 (containsLongEdgeDummy)
  it('places a path of three edges that leaves a long edge dummy (S10 longEdge)', () => {
    expectYs(replaySite('sites/NetworkSimplex/twoPaths/crossingLeftEnd/longEdge').pos, {
      'g0/n0': 0,
      'g0/n1': 50,
      'g0/n2': 50,
      'new/n0': 90,
      'g0/n3': 50,
      'new/n1': 90,
      'g0/n4': 50,
      'g0/n5': 100,
    });
  });
});
