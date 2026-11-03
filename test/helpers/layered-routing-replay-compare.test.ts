// SPDX-License-Identifier: EPL-2.0
// Tests of the routing comparer: equal dumps, a fake P5 phase that adds bend points below and above the AD-4
// tolerance, counts, key sets, the presence rule of `splines`, the full dump and the call comparison.
import { beforeAll, describe, expect, it } from 'vitest';
import type { LEdge } from '../../src/alg/layered/graph/LEdge.js';
import type { LGraph } from '../../src/alg/layered/graph/LGraph.js';
import { InternalProperties } from '../../src/alg/layered/options/InternalProperties.js';
import type { ILayoutProcessor } from '../../src/core/alg/ILayoutProcessor.js';
import { LayoutMetaDataService } from '../../src/core/data/LayoutMetaDataService.js';
import { KVector } from '../../src/core/math/KVector.js';
import { KVectorChain } from '../../src/core/math/KVectorChain.js';
import { CoreOptions } from '../../src/core/options/CoreOptions.js';
import { dumpLGraph, encodeHex } from './layered-framework-replay.js';
import { importDumpOf } from './layered-phase-replay-dump.js';
import { dumpWithPropertyValues } from './layered-site-replay-dump.js';
import type { Factories } from './layered-phase-replay-ops.js';
import { compareCall, compareRouting, compareRoutingFullDump } from './layered-routing-replay-compare.js';
import { routingDump } from './layered-routing-replay-dump.js';
import { runRoutingPrefix } from './layered-routing-replay-ops.js';
import {
  P5_EDGE_ROUTING,
  type CallResult,
  type RoutingExpected,
  type RoutingRow,
} from './layered-routing-replay-rows.js';

const GRAPH = {
  id: 'root',
  children: [
    { id: 'a', width: 10, height: 10, ports: [{ id: 'a0' }, { id: 'a1' }] },
    { id: 'b', width: 10, height: 10, ports: [{ id: 'b0' }] },
    { id: 'c', width: 10, height: 10, ports: [{ id: 'c0' }] },
  ],
  edges: [
    { id: 'e0', sources: ['a0'], targets: ['b0'] },
    { id: 'e1', sources: ['a1'], targets: ['c0'] },
  ],
};
const ROW: RoutingRow = {
  id: 'models/routing-compare',
  group: 'models',
  input: { elk: GRAPH },
  target: null,
  options: {},
  steps: null,
  prefix: [`${P5_EDGE_ROUTING}/FAKE`],
  expected: {
    layers: [],
    layerless: [],
    hidden: [],
    edges: [],
    changed: [],
    ports: {},
    geometry: { nodes: {}, layers: [], graph: { size: ['', ''], offset: ['', ''] }, edges: {} },
  },
};
const BIG_MOVE = 2e-6;
const SMALL_MOVE = 5e-7;
const BEND_X = 10;
const BEND_Y = 20;

beforeAll(() => {
  LayoutMetaDataService.initElkReflect();
});

type Mutation = (graph: LGraph) => void;

/** The parts of a dump the tests edit, as a mutable view of the same object (`editable`). */
interface Editable {
  layerless: string[];
  geometry: {
    edges: Record<string, { bendPoints: unknown[]; junctionPoints?: unknown[] }>;
    splines?: Record<
      string,
      {
        chain: string[];
        route: { rank: number; isStraight: boolean; xDelta: string; centerControlPointY: string }[];
      }
    >;
  };
}
const editable = (dump: RoutingExpected): Editable => dump as unknown as Editable;

/** The dump after a fake P5 phase that applies `mutation`. */
function routed(mutation: Mutation): { dump: RoutingExpected; graph: LGraph } {
  const phase = { process: mutation } as unknown as ILayoutProcessor<LGraph>;
  const factories: Factories = { createProcessor: () => phase, createPhase: () => phase };
  const graph = runRoutingPrefix(ROW, factories);
  return { dump: routingDump(graph, importDumpOf(graph)), graph };
}

const edgesOf = (graph: LGraph): LEdge[] =>
  graph
    .getLayerlessNodes()
    .flatMap((node) => node.getPorts())
    .flatMap((port) => port.getOutgoingEdges());

/** A fake P5 that gives each edge one bend point, the k-th moved by `moves[k]` in x. */
const bendEach =
  (moves: readonly number[]): Mutation =>
  (graph) =>
    edgesOf(graph).forEach((edge, k) => edge.getBendPoints().add(new KVector(BEND_X + moves[k]!, BEND_Y)));

const clone = (dump: RoutingExpected): RoutingExpected => structuredClone(dump);

/** A stand-in for a ported `SplineSegment` (only the fields the dump reads). */
const segment = (rank: number, isStraight = false): object => ({
  boundingBox: { x: 1, y: 2, width: 3, height: 4 },
  rank,
  isStraight,
  xDelta: 0.5,
  isWestOfInitialLayer: false,
  centerControlPointY: 6,
});

function withSpline(graph: LGraph): void {
  const [first, second] = edgesOf(graph);
  first!.setProperty(InternalProperties.SPLINE_EDGE_CHAIN, [first!, second!]);
  first!.setProperty(InternalProperties.SPLINE_ROUTE_START, [segment(1), segment(2, true)] as never);
}

describe('compareRouting', () => {
  it('reports no difference between equal dumps', () => {
    const { dump } = routed(bendEach([0, 0]));
    expect(compareRouting(dump, dump)).toEqual([]);
  });

  it('reports the bend point a fake P5 put 2e-6 off and not the one 5e-7 off', () => {
    const expected = routed(bendEach([0, 0])).dump;
    const { dump } = routed(bendEach([BIG_MOVE, SMALL_MOVE]));
    const firstPath = Object.keys(dump.geometry.edges)[0]!;
    const diffs = compareRouting(dump, expected);
    expect(diffs.map((d) => d.where)).toEqual([`geometry edges ${firstPath}`]);
    expect(diffs[0]?.message).toContain('.bendPoints[0][0]');
  });

  it('reports a bend point that is missing or extra as a count difference of that edge', () => {
    const expected = routed(bendEach([0, 0])).dump;
    const { dump } = routed((graph) => {
      bendEach([0, 0])(graph);
      edgesOf(graph)[1]!.getBendPoints().add(new KVector(1, 1));
    });
    const [, second] = Object.keys(dump.geometry.edges);
    const diffs = compareRouting(dump, expected);
    expect(diffs.map((d) => d.where)).toEqual([`geometry edges ${second}`]);
    expect(diffs[0]?.message).toContain('expected a list of 1');
    expect(compareRouting(expected, dump).map((d) => d.where)).toEqual([`geometry edges ${second}`]);
  });

  it('reports a junction point list that exists on one side only, and one that differs in count', () => {
    const { dump } = routed((graph) => {
      bendEach([0, 0])(graph);
      edgesOf(graph)[0]!.setProperty(CoreOptions.JUNCTION_POINTS, new KVectorChain(new KVector(1, 2)));
    });
    const first = Object.keys(dump.geometry.edges)[0]!;
    const absent = clone(dump);
    delete editable(absent).geometry.edges[first]!.junctionPoints;
    const diffs = compareRouting(dump, absent);
    expect(diffs.map((d) => d.where)).toEqual([`geometry edges ${first}`]);
    expect(diffs[0]?.message).toContain('expected keys ["bendPoints"], got ["bendPoints","junctionPoints"]');
    const empty = clone(dump);
    editable(empty).geometry.edges[first]!.junctionPoints = [];
    expect(compareRouting(dump, empty).map((d) => d.message)).toEqual([
      expect.stringContaining('expected a list of 0'),
    ]);
    expect(compareRouting(dump, clone(dump))).toEqual([]);
  });

  it('reports an edge missing from or extra in the replay by its path', () => {
    const { dump } = routed(bendEach([0, 0]));
    const [first, second] = Object.keys(dump.geometry.edges);
    const fewer = clone(dump);
    delete editable(fewer).geometry.edges[second!];
    expect(compareRouting(fewer, dump)).toEqual([{ where: `geometry edges ${second}`, message: 'missing' }]);
    expect(compareRouting(dump, fewer)).toEqual([{ where: `geometry edges ${second}`, message: 'unexpected' }]);
    expect(first).not.toBe(second);
  });

  it('reports a graph size and offset that differ by more than the tolerance', () => {
    const expected = routed(bendEach([0, 0])).dump;
    const { dump } = routed((graph) => {
      bendEach([0, 0])(graph);
      graph.getSize().x += BIG_MOVE;
      graph.getOffset().y += SMALL_MOVE;
    });
    const diffs = compareRouting(dump, expected);
    expect(diffs).toHaveLength(1);
    expect(diffs[0]?.where).toBe('geometry graph');
    expect(diffs[0]?.message).toContain('.size[0]');
  });

  it('still reports the placement differences', () => {
    const { dump } = routed(bendEach([0, 0]));
    const moved = clone(dump);
    editable(moved).layerless = [];
    expect(compareRouting(moved, dump).length).toBeGreaterThan(0);
  });
});

describe('compareRouting splines', () => {
  const splined = (): RoutingExpected =>
    routed((graph) => {
      bendEach([0, 0])(graph);
      withSpline(graph);
    }).dump;

  it('compares splines only when the expected side carries them', () => {
    const withRoute = splined();
    const without = clone(withRoute);
    delete editable(without).geometry.splines;
    expect(withRoute.geometry.splines).toBeDefined();
    expect(compareRouting(withRoute, without)).toEqual([]);
    const missing = compareRouting(without, withRoute);
    expect(missing).toHaveLength(1);
    expect(missing[0]).toEqual({ where: expect.stringMatching(/^geometry splines /), message: 'missing' });
  });

  it('reports a rank, a boolean, a chain and an extra start edge, each by start edge path', () => {
    const expected = splined();
    const [start] = Object.keys(expected.geometry.splines ?? {});
    const actual = clone(expected);
    const splines = editable(actual).geometry.splines!;
    const spline = splines[start!]!;
    spline.route[0]!.rank = 7;
    spline.route[1]!.isStraight = false;
    spline.chain.reverse();
    splines['extra/edge'] = { chain: [], route: [] };
    const diffs = compareRouting(actual, expected);
    const own = diffs.filter((d) => d.where === `geometry splines ${start}`).map((d) => d.message);
    expect(own).toHaveLength(4);
    expect(own[0]).toContain('.chain[0]');
    expect(own[1]).toContain('.chain[1]');
    expect(own[2]).toContain('.route[0].rank');
    expect(own[3]).toContain('.route[1].isStraight');
    expect(diffs.filter((d) => d.where !== `geometry splines ${start}`)).toEqual([
      { where: 'geometry splines extra/edge', message: 'unexpected' },
    ]);
    expect(compareRouting(clone(expected), expected)).toEqual([]);
  });

  it('applies the coordinate tolerance to a box and a delta', () => {
    const expected = splined();
    const [start] = Object.keys(expected.geometry.splines ?? {});
    const near = clone(expected);
    const route = editable(near).geometry.splines![start!]!.route[0]!;
    route.xDelta = encodeHex(0.5 + SMALL_MOVE);
    expect(compareRouting(near, expected)).toEqual([]);
    route.centerControlPointY = encodeHex(6 + BIG_MOVE);
    expect(compareRouting(near, expected).map((d) => d.where)).toEqual([`geometry splines ${start}`]);
  });
});

describe('compareRoutingFullDump', () => {
  it('is empty when the row stores no full dump, and compares the dump when it does', () => {
    const { dump, graph } = routed(bendEach([0, 0]));
    const actual = { ...dump, dump: dumpLGraph(graph) };
    expect(compareRoutingFullDump(actual, dump)).toEqual([]);
    expect(compareRoutingFullDump(actual, actual)).toEqual([]);
    expect(compareRoutingFullDump(dump, actual)).toEqual([
      { where: 'dump', message: 'the replay produced no full dump' },
    ]);
  });
});

describe('compareRoutingFullDump route start', () => {
  const chained = (route: boolean): { dump: RoutingExpected; graph: LGraph } =>
    routed((graph) => {
      const [first, second] = edgesOf(graph);
      first!.setProperty(InternalProperties.SPLINE_EDGE_CHAIN, [first!, second!]);
      if (route) {
        first!.setProperty(InternalProperties.SPLINE_ROUTE_START, [segment(1)] as never);
      }
    });

  it('does not report splines.route.start, which the recorded dump leaves out, but still reports the chain', () => {
    const replayed = chained(true);
    const recorded = chained(false);
    const actual = { ...replayed.dump, dump: dumpWithPropertyValues(replayed.graph) };
    const expected = { ...recorded.dump, dump: dumpWithPropertyValues(recorded.graph) };
    expect(JSON.stringify(actual.dump)).toContain('splines.route.start');
    expect(compareRoutingFullDump(actual, expected)).toEqual([]);
    const unchained = routed(() => undefined);
    const bare = { ...unchained.dump, dump: dumpWithPropertyValues(unchained.graph) };
    expect(compareRoutingFullDump(actual, bare).length).toBeGreaterThan(0);
  });
});

describe('compareCall', () => {
  const vector = (x: number, y: number): CallResult => ({ type: 'vector', value: [encodeHex(x), encodeHex(y)] });

  it('is empty for equal results and within the tolerance, and reports a 2e-6 difference', () => {
    expect(compareCall(vector(1.5, 2), vector(1.5, 2))).toEqual([]);
    expect(compareCall(vector(1.5 + SMALL_MOVE, 2), vector(1.5, 2))).toEqual([]);
    const diffs = compareCall(vector(1.5 + BIG_MOVE, 2), vector(1.5, 2));
    expect(diffs.map((d) => d.where)).toEqual(['result']);
    expect(diffs[0]?.message).toContain('[0]');
  });

  it('reports a result of another type and compares each type by its value', () => {
    expect(compareCall({ type: 'boolean', value: true }, vector(0, 0))).toEqual([
      { where: 'result', message: 'expected a vector result, got boolean' },
    ]);
    expect(compareCall({ type: 'boolean', value: true }, { type: 'boolean', value: false })).toHaveLength(1);
    const double = (v: number): CallResult => ({ type: 'double', value: encodeHex(v) });
    expect(compareCall(double(3), double(3 + SMALL_MOVE))).toEqual([]);
    expect(compareCall(double(3), double(3 + BIG_MOVE))).toHaveLength(1);
    const quad = (v: number): CallResult => ({ type: 'rectangle', value: [1, 2, 3, v].map(encodeHex) as never });
    expect(compareCall(quad(4), quad(4))).toEqual([]);
    expect(compareCall(quad(4), quad(5))).toHaveLength(1);
  });

  it('compares a spline by control points, knot vector, dimension, box and the presence of a label position', () => {
    const nubs = (extra: object = {}): CallResult => ({
      type: 'nubs',
      value: {
        controlPoints: [[encodeHex(1), encodeHex(2)]],
        knotVector: [encodeHex(0), encodeHex(1)],
        dim: 3,
        outerBox: [1, 2, 3, 4].map(encodeHex) as never,
        ...extra,
      },
    });
    expect(compareCall(nubs(), nubs())).toEqual([]);
    expect(compareCall(nubs({ dim: 4 }), nubs())).toHaveLength(1);
    expect(compareCall(nubs({ firstLabelPosition: [encodeHex(0), encodeHex(0)] }), nubs())).toHaveLength(1);
    expect(compareCall(nubs({ knotVector: [encodeHex(0)] }), nubs())).toHaveLength(1);
  });
});
