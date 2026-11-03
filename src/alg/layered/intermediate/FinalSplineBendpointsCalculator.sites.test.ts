// SPDX-License-Identifier: EPL-2.0
// Anchored cases for the FinalSplineBendpointsCalculator branches that only the T13 `sites/*` rows reach (mission 7e,
// T14b, unreached.md S12 splines arm, S14) and structural cases for its two throws (J). Each row case replays the row
// with the router and the calculator injected and asserts the field the branch decides, the bend points of the edges,
// with literals copied from the row (L4, R14); FinalSplineBendpointsCalculator.test.ts and the generic replay compare the
// whole dump. The throw cases start from the state before the calculator on a scenario row and break one invariant by hand.
import { beforeAll, describe, expect, it } from 'vitest';
import { repoRoot } from '../../../../test/corpus/corpus.js';
import { decodeHex } from '../../../../test/helpers/layered-framework-replay.js';
import { importRow } from '../../../../test/helpers/layered-phase-replay-rows.js';
import { type Factories } from '../../../../test/helpers/layered-phase-replay-ops.js';
import { routingDump } from '../../../../test/helpers/layered-routing-replay-dump.js';
import { runRoutingSteps } from '../../../../test/helpers/layered-routing-replay-ops.js';
import {
  isGeometryRow,
  loadRoutingRows,
  type RoutingRow,
} from '../../../../test/helpers/layered-routing-replay-rows.js';
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import { LayoutMetaDataService } from '../../../core/data/LayoutMetaDataService.js';
import { PortSide } from '../../../core/options/PortSide.js';
import { BasicProgressMonitor } from '../../../core/util/BasicProgressMonitor.js';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import type { LEdge } from '../graph/LEdge.js';
import type { LGraph } from '../graph/LGraph.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import { CrossingMinimizationStrategy } from '../options/CrossingMinimizationStrategy.js';
import { CycleBreakingStrategy } from '../options/CycleBreakingStrategy.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeringStrategy } from '../options/LayeringStrategy.js';
import { NodePlacementStrategy } from '../options/NodePlacementStrategy.js';
import { SplineEdgeRouter } from '../p5edges/splines/SplineEdgeRouter.js';
import { FinalSplineBendpointsCalculator } from './FinalSplineBendpointsCalculator.js';
import { IntermediateProcessorStrategy } from './IntermediateProcessorStrategy.js';

const STEPS_FILE = `${repoRoot()}/test/golden/refs/java/layered-routing-steps.json`;
const FSBC = 'FINAL_SPLINE_BENDPOINTS_CALCULATOR';
const COORDINATE_DIGITS = 6;
const CHAIN_ROW = 'scenarios/FinalSplineBendpointsCalculator/chain';

/** Everything real, with the calculator either the class under test or a processor that does nothing. */
function factoriesWith(calculator: ILayoutProcessor<LGraph>): Factories {
  return {
    createProcessor: (name) => (name === FSBC ? calculator : IntermediateProcessorStrategy.valueOf(name).create()),
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
          expect(phase).toBe('P5_EDGE_ROUTING');
          return new SplineEdgeRouter();
      }
    },
  };
}

const injected = factoriesWith(new FinalSplineBendpointsCalculator());
const withoutCalculator = factoriesWith({ process: (): void => undefined });

beforeAll(() => {
  LayoutMetaDataService.initElkReflect();
});

const rows = loadRoutingRows(STEPS_FILE).filter(isGeometryRow);

function rowById(id: string): RoutingRow {
  const row = rows.find((candidate) => candidate.id === id);
  if (row === undefined) {
    throw new Error(`no row ${id}`);
  }
  return row;
}

type Edges = Readonly<Record<string, readonly (readonly [number, number])[]>>;

/** The bend points of every edge the replay left, decoded, keyed by edge path. */
function bendPointsOf(id: string): Record<string, [number, number][]> {
  const row = rowById(id);
  const edges = routingDump(runRoutingSteps(row, injected), importRow(row).importDump).geometry.edges;
  return Object.fromEntries(
    Object.entries(edges).map(([path, edge]) => [
      path,
      edge.bendPoints.map(([x, y]) => [decodeHex(x), decodeHex(y)] as [number, number]),
    ]),
  );
}

function expectEdges(actual: Record<string, [number, number][]>, expected: Edges): void {
  for (const [path, points] of Object.entries(expected)) {
    expect(actual[path], path).toHaveLength(points.length);
    points.forEach(([x, y], index) => {
      expect(actual[path]![index]![0], `${path}[${String(index)}].x`).toBeCloseTo(x, COORDINATE_DIGITS);
      expect(actual[path]![index]![1], `${path}[${String(index)}].y`).toBeCloseTo(y, COORDINATE_DIGITS);
    });
  }
}

const countsOf = (actual: Record<string, unknown[]>): Record<string, number> =>
  Object.fromEntries(Object.entries(actual).map(([path, points]) => [path, points.length]));

const NEAR_COUNTS = {
  'g0/e2': 20,
  'g0/e0': 2,
  'g0/e1': 14,
  'g0/e4': 8,
  'g0/e3': 2,
  'g0/e5': 2,
  'g0/e7': 2,
  'g0/e6': 2,
};
const NEAR_SLOPPY: Edges = {
  'g0/e0': [
    [30.0, 35.0],
    [40.0, 32.3],
  ],
  'g0/e3': [
    [90.0, 42.0],
    [100.0, 53.25],
  ],
  'g0/e5': [
    [140.0, 54.5],
    [150.0, 55.5],
  ],
  'g0/e7': [
    [200.0, 19.5],
    [220.0, 19.95],
  ],
  'g0/e6': [
    [210.0, 69.5],
    [220.0, 66.95],
  ],
};
const FAR_COUNTS = {
  'g0/e3': 14,
  'g0/e2': 2,
  'g0/e0': 2,
  'g0/e1': 2,
  'g0/e7': 2,
  'g0/e4': 2,
  'g0/e5': 2,
  'g0/e6': 2,
  'g0/e8': 2,
  'g0/e9': 2,
};
const FAR_SLOPPY: Edges = {
  'g0/e2': [
    [30.0, -74.125],
    [45.0, -103.7125],
  ],
  'g0/e0': [
    [30.0, -70.125],
    [45.0, -44.8125],
  ],
  'g0/e1': [
    [30.0, -66.125],
    [45.0, 9.587499999999999],
  ],
  'g0/e7': [
    [95.0, -107.0],
    [110.0, -102.2],
  ],
  'g0/e4': [
    [95.0, -42.0],
    [110.0, -42.2],
  ],
  'g0/e5': [
    [100.0, 13.0],
    [110.0, 8.8],
  ],
  'g0/e6': [
    [100.0, 23.0],
    [110.0, 23.0],
  ],
  'g0/e8': [
    [150.0, -44.0],
    [160.0, -43.8],
  ],
  'g0/e9': [
    [150.0, 23.0],
    [160.0, 17.375],
  ],
};
const PARALLEL_COUNTS = { 'g0/e0': 2, 'g0/e1': 5, 'g0/e2': 2, 'g0/e3': 2 };
const PARALLEL_POINTS: Edges = {
  'g0/e0': [
    [34.0, 15.0],
    [44.0, 38.4],
  ],
  'g0/e1': [
    [44.0, 15.0],
    [56.5, 15.0],
    [69.0, 15.0],
    [81.5, 15.0],
    [94.0, 15.0],
  ],
  'g0/e2': [
    [34.0, 15.0],
    [44.0, 15.0],
  ],
  'g0/e3': [
    [84.0, 41.0],
    [94.0, 38.4],
  ],
};

describe('FinalSplineBendpointsCalculator.segmentAllowsSloppyRouting with compaction (T14b, S14)', () => {
  it('keeps the sloppy routing of segments next to their nodes: two bend points per short edge', () => {
    // oracle: sites/FinalSplineBendpoints/compaction/near; FinalSplineBendpointsCalculator.java:586-616 (compaction
    // strategy LEFT is read from the option alone; both node distances stay within the threshold)
    const actual = bendPointsOf('sites/FinalSplineBendpoints/compaction/near');
    expect(countsOf(actual)).toEqual(NEAR_COUNTS);
    expectEdges(actual, NEAR_SLOPPY);
  });

  it('keeps the sloppy routing on a graph where every segment starts or ends at a node', () => {
    // oracle: sites/FinalSplineBendpoints/compaction/far; FinalSplineBendpointsCalculator.java:586-616 (the same eight
    // arms as `near`: T13 moved the `return false` arms :597 and :607 to U)
    const actual = bendPointsOf('sites/FinalSplineBendpoints/compaction/far');
    expect(countsOf(actual)).toEqual(FAR_COUNTS);
    expectEdges(actual, FAR_SLOPPY);
  });
});

describe('FinalSplineBendpointsCalculator with a tail edge shared by two start edges (T14b, S12)', () => {
  it('gives the shared edge the converted points once and leaves the cleared ones empty the second time', () => {
    // oracle: sites/HyperedgeMerger/parallelLongEdges/splines; FinalSplineBendpointsCalculator.java:503 (the
    // `!currentBendPoints.isEmpty()` test is false for the shared edge on the second conversion, unreached.md :507)
    const actual = bendPointsOf('sites/HyperedgeMerger/parallelLongEdges/splines');
    expect(countsOf(actual)).toEqual(PARALLEL_COUNTS);
    expectEdges(actual, PARALLEL_POINTS);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// J: the two throws of calculateBezierBendPoints, on the state before the calculator with one invariant broken by hand

/** The state before the calculator on a scenario row, and the start edges of its splines. */
function beforeCalculator(): { graph: LGraph; startEdges: LEdge[] } {
  const graph = runRoutingSteps(rowById(CHAIN_ROW), withoutCalculator);
  const startEdges = graph
    .getLayers()
    .flatMap((layer) => layer.getNodes())
    .flatMap((node) => [...node.getOutgoingEdges()])
    .filter((edge) => edge.hasProperty(InternalProperties.SPLINE_ROUTE_START));
  expect(startEdges.length).toBeGreaterThan(0);
  return { graph, startEdges };
}

/** The error the calculator throws on this state (the first run mutates the edges, so the state serves one run). */
function thrownByCalculator(graph: LGraph): unknown {
  try {
    new FinalSplineBendpointsCalculator().process(graph, new BasicProgressMonitor());
  } catch (error) {
    return error;
  }
  throw new Error('the calculator did not throw');
}

describe('FinalSplineBendpointsCalculator.calculateBezierBendPoints on broken state (T14b, J)', () => {
  it('refuses a chain whose first edge leaves a node that is neither normal nor a north/south or external port', () => {
    // J: FinalSplineBendpointsCalculator.java:478-480 (IllegalArgumentException)
    const { graph, startEdges } = beforeCalculator();
    startEdges.forEach((edge) => edge.getSource()!.getNode()!.setType(NodeType.LONG_EDGE));
    const error = thrownByCalculator(graph);
    expect(error).toBeInstanceOf(IllegalArgumentException);
    expect((error as Error).message).toBe('The target node of the edge must be a normal node or a northSouthPort.');
  });

  it('throws the unboxing TypeError when the source port is on a north or south side without the y coordinate', () => {
    // J: FinalSplineBendpointsCalculator.java:488 (the unboxed Double of SPLINE_NS_PORT_Y_COORD, a NullPointerException)
    const { graph, startEdges } = beforeCalculator();
    startEdges.forEach((edge) => edge.getSource()!.setSide(PortSide.NORTH));
    const error = thrownByCalculator(graph);
    expect(error).toBeInstanceOf(TypeError);
    expect((error as Error).message).toMatch(/Cannot unbox the spline north\/south y coordinate/);
  });

  it('throws the same TypeError for the target port (the twin at the other end of the chain)', () => {
    // J: FinalSplineBendpointsCalculator.java:524 (the surviving edge is the first of the chain, joined to the real target)
    const { graph, startEdges } = beforeCalculator();
    startEdges.forEach((edge) => edge.getTarget()!.setSide(PortSide.SOUTH));
    expect(thrownByCalculator(graph)).toBeInstanceOf(TypeError);
  });
});
