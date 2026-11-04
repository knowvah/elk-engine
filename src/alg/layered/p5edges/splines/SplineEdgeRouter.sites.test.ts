// SPDX-License-Identifier: EPL-2.0
// Anchored cases for the SplineEdgeRouter branches that only the T13 `sites/SplineEdgeRouter/*` and `sites/SelfLoop/splines`
// rows reach (mission 7e, T14b, unreached.md S15, S16, S13) and structural cases for the arms no replay can take (J).
// Each row case replays the row with the router injected and asserts the `splines` summary the branch decides (chain,
// rank, straightness, xDelta, box) with literals copied from the row (L4, R14); SplineEdgeRouter.test.ts and the generic
// replay compare the whole dump. The J cases build their state by hand from the Java text.
import { beforeAll, describe, expect, it } from 'vitest';
import { repoRoot } from '../../../../../test/corpus/corpus.js';
import { decodeHex } from '../../../../../test/helpers/layered-framework-replay.js';
import { importRow } from '../../../../../test/helpers/layered-phase-replay-rows.js';
import { type Factories } from '../../../../../test/helpers/layered-phase-replay-ops.js';
import { routingDump } from '../../../../../test/helpers/layered-routing-replay-dump.js';
import { runRoutingSteps } from '../../../../../test/helpers/layered-routing-replay-ops.js';
import { isGeometryRow, loadRoutingRows } from '../../../../../test/helpers/layered-routing-replay-rows.js';
import type { ILayoutProcessor } from '../../../../core/alg/ILayoutProcessor.js';
import { LayoutMetaDataService } from '../../../../core/data/LayoutMetaDataService.js';
import { PortSide } from '../../../../core/options/PortSide.js';
import { IllegalArgumentException } from '../../../../java/lang/IllegalArgumentException.js';
import { LEdge } from '../../graph/LEdge.js';
import { LGraph } from '../../graph/LGraph.js';
import { LNode } from '../../graph/LNode.js';
import { LPort } from '../../graph/LPort.js';
import { Layer } from '../../graph/Layer.js';
import { IntermediateProcessorStrategy } from '../../intermediate/IntermediateProcessorStrategy.js';
import { CrossingMinimizationStrategy } from '../../options/CrossingMinimizationStrategy.js';
import { CycleBreakingStrategy } from '../../options/CycleBreakingStrategy.js';
import { LayeringStrategy } from '../../options/LayeringStrategy.js';
import { NodePlacementStrategy } from '../../options/NodePlacementStrategy.js';
import { SplineEdgeRouter } from './SplineEdgeRouter.js';
import { clearThenFillMappings, createSplineRouterState, createSplineSegments } from './SplineEdgeRouterSegments.js';

const STEPS_FILE = `${repoRoot()}/test/golden/refs/java/layered-routing-steps.json`;
const COORDINATE_DIGITS = 6;

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
        expect(phase).toBe('P5_EDGE_ROUTING');
        return new SplineEdgeRouter();
    }
  },
};

beforeAll(() => {
  LayoutMetaDataService.initElkReflect();
});

const rows = loadRoutingRows(STEPS_FILE).filter(isGeometryRow);

/** One segment of a route as a literal: rank and straightness exact, xDelta and the (x, y, width, height) box at AD-4. */
interface Segment {
  readonly rank: number;
  readonly isStraight: boolean;
  readonly xDelta: number;
  readonly box: readonly number[];
}
type Splines = Readonly<Record<string, { readonly chain: readonly string[]; readonly route: readonly Segment[] }>>;

/** Replays the row with the router injected and returns the `splines` summary decoded. */
function replayedSplines(id: string): Splines {
  const row = rows.find((candidate) => candidate.id === id);
  if (row === undefined) {
    throw new Error(`no row ${id}`);
  }
  const actual = routingDump(runRoutingSteps(row, factories), importRow(row).importDump);
  return Object.fromEntries(
    Object.entries(actual.geometry.splines ?? {}).map(([path, spline]) => [
      path,
      {
        chain: spline.chain,
        route: spline.route.map((segment) => ({
          rank: segment.rank,
          isStraight: segment.isStraight,
          xDelta: decodeHex(segment.xDelta),
          box: segment.box.map(decodeHex),
        })),
      },
    ]),
  );
}

function expectSplines(actual: Splines, expected: Splines): void {
  expect(Object.keys(actual).sort()).toEqual(Object.keys(expected).sort());
  for (const [path, spline] of Object.entries(expected)) {
    expect(actual[path]!.chain, path).toEqual(spline.chain);
    expect(actual[path]!.route, path).toHaveLength(spline.route.length);
    spline.route.forEach((segment, k) => {
      const got = actual[path]!.route[k]!;
      expect([got.rank, got.isStraight], `${path}[${String(k)}]`).toEqual([segment.rank, segment.isStraight]);
      expect(got.xDelta).toBeCloseTo(segment.xDelta, COORDINATE_DIGITS);
      segment.box.forEach((value, index) => expect(got.box[index]).toBeCloseTo(value, COORDINATE_DIGITS));
    });
  }
}

const ranksOf = (splines: Splines): number[] =>
  ['g0/e0', 'g0/e1', 'g0/e2', 'g0/e3'].map((p) => splines[p]!.route[0]!.rank);

const UNIFORM4: Splines = {
  'g0/e0': { chain: ['g0/e0'], route: [{ rank: 1, isStraight: false, xDelta: 0.0, box: [30.0, 10.0, 50.0, 120.0] }] },
  'g0/e1': { chain: ['g0/e1'], route: [{ rank: 3, isStraight: false, xDelta: 0.0, box: [30.0, 50.0, 50.0, 40.0] }] },
  'g0/e2': { chain: ['g0/e2'], route: [{ rank: 0, isStraight: false, xDelta: 0.0, box: [30.0, 10.0, 50.0, 80.0] }] },
  'g0/e3': { chain: ['g0/e3'], route: [{ rank: 2, isStraight: false, xDelta: 0.0, box: [30.0, 50.0, 50.0, 80.0] }] },
};
const TIE_SEED_1: Splines = {
  'g0/e0': { chain: ['g0/e0'], route: [{ rank: 3, isStraight: false, xDelta: 0.0, box: [30.0, 10.0, 50.0, 240.0] }] },
  'g0/e1': { chain: ['g0/e1'], route: [{ rank: 2, isStraight: false, xDelta: 0.0, box: [30.0, 210.0, 50.0, 120.0] }] },
  'g0/e2': { chain: ['g0/e2'], route: [{ rank: 0, isStraight: false, xDelta: 0.0, box: [30.0, 90.0, 50.0, 160.0] }] },
  'g0/e3': { chain: ['g0/e3'], route: [{ rank: 1, isStraight: false, xDelta: 0.0, box: [30.0, 210.0, 50.0, 80.0] }] },
};
const TIE_SEED_4096: Splines = {
  'g0/e0': { chain: ['g0/e0'], route: [{ rank: 1, isStraight: false, xDelta: 0.0, box: [30.0, 10.0, 50.0, 240.0] }] },
  'g0/e1': { chain: ['g0/e1'], route: [{ rank: 0, isStraight: false, xDelta: 0.0, box: [30.0, 210.0, 50.0, 120.0] }] },
  'g0/e2': { chain: ['g0/e2'], route: [{ rank: 2, isStraight: false, xDelta: 0.0, box: [30.0, 90.0, 50.0, 160.0] }] },
  'g0/e3': { chain: ['g0/e3'], route: [{ rank: 3, isStraight: false, xDelta: 0.0, box: [30.0, 210.0, 50.0, 80.0] }] },
};
const RIGHTWARD_NESTING: Splines = {
  'g0/e0': {
    chain: ['g0/e0'],
    route: [{ rank: 2, isStraight: false, xDelta: 0.0, box: [30.0, 15.0, 40.0, 164.33333333333334] }],
  },
  'g0/e2': {
    chain: ['g0/e2'],
    route: [{ rank: 0, isStraight: false, xDelta: 0.0, box: [30.0, 65.0, 40.0, 187.66666666666666] }],
  },
  'g0/e3': {
    chain: ['g0/e3', 'new/e0'],
    route: [
      { rank: 1, isStraight: false, xDelta: 0.0, box: [30.0, 110.0, 40.0, 157.33333333333331] },
      { rank: 0, isStraight: false, xDelta: 0.0, box: [108.0, 110.0, 20.0, 15.0] },
    ],
  },
  'g0/e1': {
    chain: ['g0/e1', 'new/e1'],
    route: [
      { rank: 2, isStraight: false, xDelta: 0.0, box: [30.0, 200.66666666666666, 40.0, 89.33333333333334] },
      { rank: 0, isStraight: false, xDelta: 0.0, box: [108.0, 275.0, 20.0, 15.0] },
    ],
  },
};
const SELF_LOOP: Splines = {
  'g0/e1': { chain: ['g0/e1'], route: [{ rank: 0, isStraight: false, xDelta: 0.0, box: [30.0, -12.0, 20.0, 20.0] }] },
  'g0/e0': { chain: ['g0/e0'], route: [{ rank: 0, isStraight: false, xDelta: 0.0, box: [30.0, 18.0, 20.0, 20.0] }] },
  'g0/e4': { chain: ['g0/e4'], route: [{ rank: 0, isStraight: false, xDelta: 0.0, box: [150.0, -12.0, 20.0, 15.25] }] },
  'g0/e3': { chain: ['g0/e3'], route: [{ rank: 0, isStraight: false, xDelta: 0.0, box: [150.0, 13.25, 20.0, 15.25] }] },
  'g0/e5': { chain: ['g0/e5'], route: [{ rank: 0, isStraight: true, xDelta: 0.0, box: [200.0, 8.25, 20.0, 0.0] }] },
};

describe('SplineEdgeRouter rank assignment on a dependency cycle (T14b, S15)', () => {
  it('peels the positive-weight cycle of four segments and ranks them 1, 3, 0, 2', () => {
    // oracle: sites/SplineEdgeRouter/dependencyCycle/uniform4; SplineEdgeRouter.java:736 (unprocessed segments remain
    // after the sink/source peeling), :763-782 (the maximum-outflow pick), :804 (the reversal of the cycle edge)
    // The ranks depend on the cycle breaking (disabling the back-edge removal in a scratch copy changes them); they do
    // not depend on whether a removed positive-weight dependency is reversed (:804), which this row reaches only.
    const splines = replayedSplines('sites/SplineEdgeRouter/dependencyCycle/uniform4');
    expect(ranksOf(splines)).toEqual([1, 3, 0, 2]);
    expectSplines(splines, UNIFORM4);
  });

  it('breaks an outflow tie by the random draw: the two recorded seeds give opposite rank orders', () => {
    // oracle: sites/SplineEdgeRouter/dependencyCycle/tie/seed1 and .../seed4096; SplineEdgeRouter.java:777 (random.nextInt, R7)
    const first = replayedSplines('sites/SplineEdgeRouter/dependencyCycle/tie/seed1');
    const second = replayedSplines('sites/SplineEdgeRouter/dependencyCycle/tie/seed4096');
    expect(ranksOf(first)).toEqual([3, 2, 0, 1]);
    expect(ranksOf(second)).toEqual([1, 0, 2, 3]);
    expect(ranksOf(first)).not.toEqual(ranksOf(second));
    expectSplines(first, TIE_SEED_1);
    expectSplines(second, TIE_SEED_4096);
  });
});

describe('SplineEdgeRouter rightward nesting (T14b, S16)', () => {
  it('ranks the nested in-layer segments 0, 1, 2 and joins each long edge to its dummy half', () => {
    // oracle: sites/SplineEdgeRouter/rightwardNesting; SplineEdgeRouter.java:919-922 (a rightward segment keeps its
    // outweight after the first of two nested targets)
    // Recorded fields: the ranks, chains and boxes. The row reaches the `outweight !== 0` arm (scoped coverage), but no
    // recorded field depends on it: flipping that test in a scratch copy leaves the ranks unchanged (every source behind
    // the nested segment has a left port, so an early or late push moves nothing). The mutation check names it.
    expectSplines(replayedSplines('sites/SplineEdgeRouter/rightwardNesting'), RIGHTWARD_NESTING);
  });
});

describe('SplineEdgeRouter with a self loop on the edge-routing path (T14b, S13)', () => {
  it('starts no spline at the self loops and routes the other edges as recorded', () => {
    // oracle: sites/SelfLoop/splines; SplineEdgeRouter.java:378 and :425 (self loops skipped as outgoing edges), :413-414 (collected in selfLoopsLayer)
    const row = rows.find((candidate) => candidate.id === 'sites/SelfLoop/splines')!;
    const graph = runRoutingSteps(row, factories);
    const selfLoops = graph
      .getLayers()
      .flatMap((layer) => layer.getNodes())
      .flatMap((node) => [...node.getOutgoingEdges()])
      .filter((edge) => edge.isSelfLoop());
    expect(selfLoops.length).toBeGreaterThan(0);
    const splines = replayedSplines('sites/SelfLoop/splines');
    expectSplines(splines, SELF_LOOP);
    expect(Object.keys(splines)).toHaveLength(5);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// J: arms no plan the replay builds can reach, on a state built by hand from the Java text

/** Three layers with one normal node each; `a` has an EAST port, `c` a WEST port, `b` has no ports. */
function threeLayers(): { layers: Layer[]; eastPort: LPort; westPort: LPort } {
  const graph = new LGraph();
  const layers = [new Layer(graph), new Layer(graph), new Layer(graph)];
  const [a, b, c] = layers.map((layer) => {
    const node = new LNode(graph);
    node.setLayer(layer);
    return node;
  }) as [LNode, LNode, LNode];
  expect(b.getPorts()).toHaveLength(0);
  const portOn = (node: LNode, side: PortSide): LPort => {
    const port = new LPort();
    port.setNode(node);
    port.setSide(side);
    return port;
  };
  return { layers, eastPort: portOn(a, PortSide.EAST), westPort: portOn(c, PortSide.WEST) };
}

describe('SplineEdgeRouter segment creation on hand-built states (T14b, J)', () => {
  it('drops an edge whose target is neither in the left nor in the right layer of the pair (the unhandled situation)', () => {
    // J: SplineEdgeRouter.java:396-401 (left layer east ports): the edge is added, then removed again; it stays a start edge
    const { layers, eastPort, westPort } = threeLayers();
    const edge = new LEdge();
    edge.setSource(eastPort);
    edge.setTarget(westPort);
    const state = createSplineRouterState();
    clearThenFillMappings(state, layers[0]!, layers[1]!);
    expect(state.edgesRemainingLayer).toEqual([]);
    expect(state.startEdges).toEqual([edge]);
    expect([...state.leftPortsLayer]).toEqual([eastPort]);
    expect([...state.rightPortsLayer]).toEqual([]);
  });

  it('keeps the same edge when its target layer is the right layer of the pair (the twin of the case above)', () => {
    // J: SplineEdgeRouter.java:394-395
    const { layers, eastPort, westPort } = threeLayers();
    const edge = new LEdge();
    edge.setSource(eastPort);
    edge.setTarget(westPort);
    const state = createSplineRouterState();
    clearThenFillMappings(state, layers[0]!, layers[2]!);
    expect(state.edgesRemainingLayer).toEqual([edge]);
    expect([...state.rightPortsLayer]).toEqual([westPort]);
  });

  it('refuses a source port that is in neither port set', () => {
    // J: SplineEdgeRouter.java:534 ("Source port must be in one of the port sets.")
    const { eastPort, westPort } = threeLayers();
    const edge = new LEdge();
    edge.setSource(eastPort);
    edge.setTarget(westPort);
    const state = createSplineRouterState();
    state.edgesRemainingLayer.push(edge);
    expect(() => createSplineSegments(state)).toThrow(IllegalArgumentException);
    expect(() => createSplineSegments(state)).toThrow('Source port must be in one of the port sets.');
  });

  it('refuses a target port that is in neither port set', () => {
    // J: SplineEdgeRouter.java:545 ("Target port must be in one of the port sets.")
    const { eastPort, westPort } = threeLayers();
    const edge = new LEdge();
    edge.setSource(eastPort);
    edge.setTarget(westPort);
    const state = createSplineRouterState();
    state.edgesRemainingLayer.push(edge);
    state.leftPortsLayer.add(eastPort);
    expect(() => createSplineSegments(state)).toThrow('Target port must be in one of the port sets.');
  });
});
