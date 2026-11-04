// SPDX-License-Identifier: EPL-2.0
// Anchored cases for the branches of the orthogonal router and of the classes it drives (HyperEdgeCycleDetector,
// HyperEdgeSegment, HyperEdgeSegmentSplitter, OrthogonalRoutingGenerator, WestToEastRoutingStrategy) that only the T13
// `sites/*` rows reach (mission 7e, T14a, unreached.md S Sc1-Sc8 and S13). Each case replays one row with the router
// injected and asserts the field the branch decides, the bend and junction points of every edge (the strategy writes
// them, WestToEastRoutingStrategy.java:45), never the whole row (OrthogonalEdgeRouter.test.ts and the generic
// replay compare that). Literals are the row's `expected.geometry.edges` (hex doubles decoded), within AD-4.
import { beforeAll, describe, expect, it } from 'vitest';
import { repoRoot } from '../../../../test/corpus/corpus.js';
import { decodeHex, type HexPair } from '../../../../test/helpers/layered-framework-replay.js';
import type { Factories } from '../../../../test/helpers/layered-phase-replay-ops.js';
import { importRow } from '../../../../test/helpers/layered-phase-replay-rows.js';
import { routingDump } from '../../../../test/helpers/layered-routing-replay-dump.js';
import { runRoutingSteps } from '../../../../test/helpers/layered-routing-replay-ops.js';
import {
  isGeometryRow,
  loadRoutingRows,
  type RoutingRow,
} from '../../../../test/helpers/layered-routing-replay-rows.js';
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import { LayoutMetaDataService } from '../../../core/data/LayoutMetaDataService.js';
import type { LGraph } from '../graph/LGraph.js';
import { IntermediateProcessorStrategy } from '../intermediate/IntermediateProcessorStrategy.js';
import { CrossingMinimizationStrategy } from '../options/CrossingMinimizationStrategy.js';
import { CycleBreakingStrategy } from '../options/CycleBreakingStrategy.js';
import { LayeringStrategy } from '../options/LayeringStrategy.js';
import { NodePlacementStrategy } from '../options/NodePlacementStrategy.js';
import { OrthogonalEdgeRouter } from './OrthogonalEdgeRouter.js';

const STEPS_FILE = `${repoRoot()}/test/golden/refs/java/layered-routing-steps.json`;
const ROUTING_PHASE = 'P5_EDGE_ROUTING';
const ORTHOGONAL = 'ORTHOGONAL';
const COORDINATE_DIGITS = 6;

/** The row-replaying factories of OrthogonalEdgeRouter.test.ts: the real enums, the router under test for P5. */
const factories: Factories = {
  createProcessor(name): ILayoutProcessor<LGraph> {
    return IntermediateProcessorStrategy.valueOf(name).create();
  },
  createPhase(phase, strategy): ILayoutProcessor<LGraph> {
    switch (phase) {
      case 'P1_CYCLE_BREAKING':
        return CycleBreakingStrategy.valueOf(strategy).create();
      case 'P2_LAYERING':
        return LayeringStrategy.valueOf(strategy).create();
      case 'P3_NODE_ORDERING':
        return CrossingMinimizationStrategy.valueOf(strategy).create();
      case 'P4_NODE_PLACEMENT':
        return NodePlacementStrategy.valueOf(strategy).create();
      default:
        expect(phase).toBe(ROUTING_PHASE);
        expect(strategy).toBe(ORTHOGONAL);
        return new OrthogonalEdgeRouter();
    }
  },
};

beforeAll(() => {
  LayoutMetaDataService.initElkReflect();
});

const rows: RoutingRow[] = loadRoutingRows(STEPS_FILE).filter(isGeometryRow);

type Point = readonly [number, number];
interface Route {
  readonly bendPoints: readonly Point[];
  readonly junctionPoints?: readonly Point[];
}

const pointOf = ([x, y]: HexPair): Point => [decodeHex(x), decodeHex(y)];

/** Replays the row with the router injected and returns the bend and junction points of every edge as the dump has them. */
function routesOf(id: string): Record<string, Route> {
  const row = rows.find((candidate) => candidate.id === id)!;
  const actual = routingDump(runRoutingSteps(row, factories), importRow(row).importDump);
  return Object.fromEntries(
    Object.entries(actual.geometry.edges).map(([path, route]) => [
      path,
      {
        bendPoints: route.bendPoints.map(pointOf),
        ...(route.junctionPoints === undefined ? {} : { junctionPoints: route.junctionPoints.map(pointOf) }),
      },
    ]),
  );
}

function expectPoints(
  actual: readonly Point[] | undefined,
  expected: readonly Point[] | undefined,
  what: string,
): void {
  expect(actual?.length, what).toBe(expected?.length);
  expected?.forEach(([x, y], i) => {
    expect(actual![i]![0], `${what}[${String(i)}].x`).toBeCloseTo(x, COORDINATE_DIGITS);
    expect(actual![i]![1], `${what}[${String(i)}].y`).toBeCloseTo(y, COORDINATE_DIGITS);
  });
}

function expectRoutes(id: string, expected: Record<string, Route>): void {
  const actual = routesOf(id);
  // the edge map is unordered (the comparators of the helpers treat it as a map)
  expect(Object.keys(actual).sort()).toEqual(Object.keys(expected).sort());
  for (const [path, route] of Object.entries(expected)) {
    expectPoints(actual[path]!.bendPoints, route.bendPoints, `${path} bend points`);
    expectPoints(actual[path]!.junctionPoints, route.junctionPoints, `${path} junction points`);
  }
}

describe('OrthogonalEdgeRouter site rows (T14a)', () => {
  it('Sc1: a critical two-cycle is broken by splitting one edge, the other keeps its straight route', () => {
    // oracle: sites/OrthogonalRoutingGenerator/crossedPair; OrthogonalRoutingGenerator.java:344 (conflicts1 critical),
    // HyperEdgeCycleDetector.java:194-195 (equal outflow in the critical pass), HyperEdgeSegmentSplitter.java:57
    expectRoutes('sites/OrthogonalRoutingGenerator/crossedPair', {
      'g0/e0': {
        bendPoints: [
          [50, 15],
          [50, 65],
        ],
      },
      'g0/e1': {
        bendPoints: [
          [40, 65],
          [40, 40],
          [60, 40],
          [60, 15],
        ],
      },
    });
  });

  it('Sc2: two critical two-cycles split the shorter segment of each first (sorted by length)', () => {
    // oracle: sites/HyperEdgeSegmentSplitter/twoCycles; HyperEdgeSegmentSplitter.java:71 (sorted by getLength,
    // HyperEdgeSegment.java:320), :212 and :215 (free areas past the end are a break, areas above the start are skipped)
    expectRoutes('sites/HyperEdgeSegmentSplitter/twoCycles', {
      'g0/e0': {
        bendPoints: [
          [40, 15],
          [40, 40],
          [60, 40],
          [60, 65],
        ],
      },
      'g0/e1': {
        bendPoints: [
          [50, 65],
          [50, 15],
        ],
      },
      'g0/e2': {
        bendPoints: [
          [40, 215],
          [40, 240],
          [60, 240],
          [60, 265],
        ],
      },
      'g0/e3': {
        bendPoints: [
          [50, 265],
          [50, 215],
        ],
      },
    });
  });

  it('Sc3: one source port feeding two WEST ports at the same offset yields one port position', () => {
    // oracle: sites/HyperEdgeSegment/equalPortPositions; HyperEdgeSegment.java:150 (insertSorted meets an equal value)
    expectRoutes('sites/HyperEdgeSegment/equalPortPositions', {
      'g0/e0': {
        bendPoints: [
          [44, 15],
          [44, 70],
        ],
      },
      'g0/e1': {
        bendPoints: [
          [44, 15],
          [44, 70],
        ],
      },
    });
  });

  it('Sc4: a segment with critical outgoing and no critical incoming dependencies is taken first', () => {
    // oracle: sites/HyperEdgeCycleDetector/criticalOutNoCriticalIn; HyperEdgeCycleDetector.java:187,
    // OrthogonalRoutingGenerator.java:412 (a non-critical conflict counts)
    expectRoutes('sites/HyperEdgeCycleDetector/criticalOutNoCriticalIn', {
      'g0/e0': {
        bendPoints: [
          [40, 55],
          [40, 173.33333333333334],
        ],
      },
      'g0/e1': {
        bendPoints: [
          [60, 170],
          [60, 176.66666666666666],
        ],
      },
      'g0/e2': {
        bendPoints: [
          [50, 180],
          [50, 55],
        ],
      },
    });
  });

  it('Sc5: a hyperedge source and a regular target split the regular segment', () => {
    // oracle: sites/HyperEdgeSegmentSplitter/hyperedgeSplitsRegular; HyperEdgeSegmentSplitter.java:142
    expectRoutes('sites/HyperEdgeSegmentSplitter/hyperedgeSplitsRegular', {
      'g0/e0': {
        bendPoints: [
          [44, 15],
          [44, 57.5],
          [64, 57.5],
          [64, 100],
        ],
      },
      'g0/e1': {
        bendPoints: [
          [54, 95],
          [54, 20],
        ],
        junctionPoints: [[54, 95]],
      },
      'g0/e2': {
        bendPoints: [
          [54, 95],
          [54, 180],
        ],
      },
    });
  });

  it('Sc6: of several free areas the one with fewer dependencies is used', () => {
    // oracle: sites/HyperEdgeSegmentSplitter/areaRatingFewerDependencies; HyperEdgeSegmentSplitter.java:363-364
    // (second criterion), :328-332 (equal crossings in both orders)
    expectRoutes('sites/HyperEdgeSegmentSplitter/areaRatingFewerDependencies', {
      'g0/e0': {
        bendPoints: [
          [70, 55],
          [70, 165],
        ],
      },
      'g0/e1': {
        bendPoints: [
          [50, 65],
          [50, 265],
        ],
      },
      'g0/e2': {
        bendPoints: [
          [40, 75],
          [40, 215],
        ],
      },
      'g0/e3': {
        bendPoints: [
          [40, 265],
          [40, 240],
          [60, 240],
          [60, 65],
        ],
      },
    });
  });

  it('Sc7: of several free areas the one with fewer crossings is used', () => {
    // oracle: sites/HyperEdgeSegmentSplitter/areaRatingFewerCrossings; HyperEdgeSegmentSplitter.java:358-360 (first
    // criterion), :388 (the used area is too small to be split further)
    expectRoutes('sites/HyperEdgeSegmentSplitter/areaRatingFewerCrossings', {
      'g0/e0': {
        bendPoints: [
          [54, 115],
          [54, 165],
        ],
        junctionPoints: [[54, 165]],
      },
      'g0/e1': {
        bendPoints: [
          [54, 115],
          [54, 265],
        ],
      },
      'g0/e2': {
        bendPoints: [
          [44, 165],
          [44, 267.5],
          [64, 267.5],
          [64, 115],
        ],
        junctionPoints: [[44, 267.5]],
      },
      'g0/e3': {
        bendPoints: [
          [44, 165],
          [44, 267.5],
          [64, 267.5],
          [64, 215],
        ],
        junctionPoints: [[64, 215]],
      },
      'g0/e4': {
        bendPoints: [
          [54, 260],
          [54, 165],
        ],
        junctionPoints: [[54, 260]],
      },
      'g0/e5': {
        bendPoints: [
          [44, 270],
          [44, 267.5],
          [64, 267.5],
          [64, 215],
        ],
      },
    });
  });

  it('Sc8: a later cycle dependency with an endpoint already chosen is skipped, a larger area wins a tie', () => {
    // oracle: sites/HyperEdgeSegmentSplitter/denseCycles; HyperEdgeSegmentSplitter.java:128 (endpoint already chosen),
    // :368 (third criterion: size), OrthogonalRoutingGenerator.java:350 (only conflicts2 not critical)
    expectRoutes('sites/HyperEdgeSegmentSplitter/denseCycles', {
      'g0/e0': {
        bendPoints: [
          [54, 3],
          [54, 13.333333333333334],
        ],
      },
      'g0/e1': {
        bendPoints: [
          [44, 11],
          [44, 222.5],
          [74, 222.5],
          [74, 70],
        ],
        junctionPoints: [
          [74, 222.5],
          [74, 70],
        ],
      },
      'g0/e2': {
        bendPoints: [
          [64, 19],
          [64, 120],
        ],
        junctionPoints: [[64, 120]],
      },
      'g0/e3': {
        bendPoints: [
          [54, 27],
          [54, 165],
        ],
      },
      'g0/e4': {
        bendPoints: [
          [64, 70],
          [64, 120],
        ],
        junctionPoints: [[64, 70]],
      },
      'g0/e5': {
        bendPoints: [
          [64, 70],
          [64, 175],
        ],
      },
      'g0/e6': {
        bendPoints: [
          [44, 120],
          [44, 222.5],
          [74, 222.5],
          [74, 70],
        ],
        junctionPoints: [[44, 120]],
      },
      'g0/e7': {
        bendPoints: [
          [44, 120],
          [44, 222.5],
          [74, 222.5],
          [74, 270],
        ],
      },
      'g0/e8': {
        bendPoints: [
          [44, 165],
          [44, 222.5],
          [74, 222.5],
          [74, 26.666666666666668],
        ],
        junctionPoints: [[44, 165]],
      },
      'g0/e9': {
        bendPoints: [
          [44, 165],
          [44, 222.5],
          [74, 222.5],
          [74, 70],
        ],
      },
    });
  });

  it('S13: the orthogonal router adds no bend point to a self loop it meets', () => {
    // oracle: sites/SelfLoop/orthogonal; WestToEastRoutingStrategy.java:58 (edge.isSelfLoop() skips the east-east loop g0/e2)
    expectRoutes('sites/SelfLoop/orthogonal', {
      'g0/e1': {
        bendPoints: [
          [40, 23.5],
          [40, -16.5],
        ],
      },
      'g0/e0': { bendPoints: [] },
      'g0/e4': {
        bendPoints: [
          [160, -16.5],
          [160, 14],
        ],
      },
      'g0/e3': { bendPoints: [] },
      'g0/e2': { bendPoints: [] },
      'g0/e5': { bendPoints: [] },
      'g0/e6': {
        bendPoints: [
          [229.33333333333334, -10],
          [240.66666666666666, -10],
        ],
      },
    });
  });
});
