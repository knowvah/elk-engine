// SPDX-License-Identifier: EPL-2.0
// Anchored cases for the horizontal compaction classes (mission 7g, T21b, W14/F12). Each case replays one row of
// test/golden/refs/java/layered-loops.json through the real classes (`runLoopsRow`, the interpreter `replayLoopsRow` uses)
// and asserts one class-level fact against the value the row records: the x position a strategy leaves a named node at, the
// lock a transformed node gets, the comment-box and external-port positions, the inverted-port arm, the junction points a
// vertical segment moves. Coordinates compare at AD-4 (1e-6). A leading `// oracle:` comment names the row and the Java line;
// the structural case at the end derives its expectation from the Java line it cites.
import { beforeAll, describe, expect, it } from 'vitest';
import { runLabelsFullRow } from '../../../../../test/helpers/layered-labels-replay-full.js';
import { registerLayered } from '../../../../../test/helpers/layered-framework-replay.js';
import { labelsDump, type LabelsExpected } from '../../../../../test/helpers/layered-labels-replay-dump.js';
import { runLoopsRow } from '../../../../../test/helpers/layered-loops-replay-ops.js';
import {
  loadLoopsRows,
  registerLoopsEnums,
  rowsByGroup,
  type FullRow,
  type LoopsRow,
} from '../../../../../test/helpers/layered-loops-replay-rows.js';
import { withoutSelfLoopHolder } from '../../../../../test/helpers/layered-loops-replay-selfloops.js';
import { installWrappingEncoding, withListOptions } from '../../../../../test/helpers/layered-loops-replay-wrapping.js';
import { contextOf } from '../../../../../test/helpers/layered-phase-replay-dump.js';
import { Direction } from '../../../../core/options/Direction.js';
import { EdgeRouting } from '../../../../core/options/EdgeRouting.js';
import { ComponentsProcessor } from '../../components/ComponentsProcessor.js';
import { LGraph } from '../../graph/LGraph.js';
import { LayeredOptions } from '../../options/LayeredOptions.js';
import { LGraphToCGraphTransformer } from './LGraphToCGraphTransformer.js';

const AD4_TOLERANCE = 1e-6;
const HEX_DIGITS_PER_DOUBLE = 16;
const COMPACTOR_STEP = 'HORIZONTAL_COMPACTOR';
const SCENARIO = 'scenarios/HorizontalGraphCompactor';
const SITE = 'sites/HorizontalGraphCompactor';

const rowsById = new Map(
  [
    ...rowsByGroup('sites', loadLoopsRows()),
    ...rowsByGroup('scenarios', loadLoopsRows()),
    ...rowsByGroup('full', loadLoopsRows()),
  ].map((row) => [row.id, row] as const),
);

function rowOf(id: string): LoopsRow {
  const row = rowsById.get(id);
  if (row === undefined) {
    throw new Error(`no row ${id}`);
  }
  return row;
}

/** A hex-encoded double of a row (`encodeHex`). */
function decode(hex: string): number {
  expect(hex).toHaveLength(HEX_DIGITS_PER_DOUBLE);
  return new DataView(Uint8Array.from(hex.match(/../g)!, (byte) => Number.parseInt(byte, 16)).buffer).getFloat64(0);
}

type StepRow = Parameters<typeof runLoopsRow>[0];
const environment = { components: new ComponentsProcessor() };
const stepRowOf = (id: string): StepRow => withListOptions(rowOf(id) as never) as never as StepRow;

/** The row replayed to its `dump` and dumped as the replay does (`replayStop`). */
function dumpOf(id: string): LabelsExpected {
  const row = stepRowOf(id);
  const result = runLoopsRow(row, environment);
  return withoutSelfLoopHolder(labelsDump(result, row.expected as never)) as LabelsExpected;
}

/** The graph a row's steps leave before `HORIZONTAL_COMPACTOR` (no dump). */
function graphBeforeCompactor(id: string): LGraph {
  const row = stepRowOf(id);
  const stop = row.steps!.findIndex(([op, name]) => op === 'runProcessor' && name === COMPACTOR_STEP);
  expect(stop).toBeGreaterThan(0);
  return runLoopsRow({ ...row, steps: row.steps!.slice(0, stop) }, environment).graph;
}

const recordedOf = (id: string): LabelsExpected => rowOf(id).expected as unknown as LabelsExpected;
const near = (actual: number, expected: number): void =>
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(AD4_TOLERANCE);

/** `[x, y]` of a node of a dump. */
const nodePos = (dump: LabelsExpected, path: string): [number, number] => {
  const [x, y] = dump.geometry.nodes[path]!.pos;
  return [decode(x), decode(y)];
};

const pairsOf = (hexes: readonly (readonly [string, string])[]): [number, number][] =>
  hexes.map(([x, y]) => [decode(x), decode(y)]);

/** Asserts a node position against literals copied from the row, and against the row itself. */
function expectNode(id: string, path: string, x: number, y: number): void {
  const [ax, ay] = nodePos(dumpOf(id), path);
  near(ax, x);
  near(ay, y);
  const [rx, ry] = nodePosOfRow(id, path);
  near(ax, rx);
  near(ay, ry);
}

const nodePosOfRow = (id: string, path: string): [number, number] => nodePos(recordedOf(id), path);

type Point = { x: number; y: number };
type ElkEdge = { id: string; sections: { bendPoints?: Point[] }[]; labels?: Point[] };
type Layout = {
  width: number;
  height: number;
  children?: (Layout & { id: string; x: number; y: number })[];
  edges?: ElkEdge[];
};

/** `[id, x, y]` of every node of an exported layout, nested ids joined with `/`. */
function flatten(node: Layout, prefix = ''): [string, number, number][] {
  return (node.children ?? []).flatMap((child): [string, number, number][] => [
    [`${prefix}${child.id}`, child.x, child.y],
    ...flatten(child, `${prefix}${child.id}/`),
  ]);
}

const allEdges = (node: Layout): ElkEdge[] => [...(node.edges ?? []), ...(node.children ?? []).flatMap(allEdges)];

/** What a `full` row must show: its size, its node positions and the bend points of one edge (and the label positions of some). */
interface FullFacts {
  readonly size: [number, number];
  readonly nodes: [string, number, number][];
  readonly edge: [string, [number, number][]];
  readonly labels?: Record<string, [number, number]>;
}

/** A `full` row laid out by the engine against literals copied from its row; every edge section also equals the recorded one. */
function expectFullLayout(id: string, facts: FullFacts): void {
  const row = rowOf(id) as unknown as FullRow;
  const actual = runLabelsFullRow(row).layout as Layout;
  const recorded = (row.expected as { layout: Layout }).layout;
  near(actual.width, facts.size[0]);
  near(actual.height, facts.size[1]);
  const flat = flatten(actual);
  expect(flat.map(([path]) => path)).toEqual(facts.nodes.map(([path]) => path));
  flat.forEach(([, x, y], i) => {
    near(x, facts.nodes[i]![1]);
    near(y, facts.nodes[i]![2]);
  });
  expect(flat).toEqual(flatten(recorded));
  const edges = allEdges(actual);
  const recordedEdges = allEdges(recorded);
  expect(edges.map((edge) => edge.id)).toEqual(recordedEdges.map((edge) => edge.id));
  const bendsOf = (edge: ElkEdge | undefined): Point[] =>
    (edge?.sections ?? []).flatMap((section) => section.bendPoints ?? []);
  const [edgeId, bends] = facts.edge;
  const found = bendsOf(edges.find((edge) => edge.id === edgeId));
  expect(found).toHaveLength(bends.length);
  found.forEach((point, i) => {
    near(point.x, bends[i]![0]);
    near(point.y, bends[i]![1]);
  });
  edges.forEach((edge, i) => {
    const expectedBends = bendsOf(recordedEdges[i]);
    const actualBends = bendsOf(edge);
    expect(actualBends).toHaveLength(expectedBends.length);
    actualBends.forEach((point, k) => {
      near(point.x, expectedBends[k]!.x);
      near(point.y, expectedBends[k]!.y);
    });
    (edge.labels ?? []).forEach((label, k) => {
      near(label.x, recordedEdges[i]!.labels![k]!.x);
      near(label.y, recordedEdges[i]!.labels![k]!.y);
    });
  });
  for (const [edgeOfLabel, [x, y]] of Object.entries(facts.labels ?? {})) {
    const label = edges.find((edge) => edge.id === edgeOfLabel)!.labels![0]!;
    near(label.x, x);
    near(label.y, y);
  }
}

beforeAll(() => {
  registerLayered();
  registerLoopsEnums();
  installWrappingEncoding();
});

describe('horizontal compaction classes on the oracle rows (F12)', () => {
  // oracle: sites/HorizontalGraphCompactor/commentWithoutEdge/LEFT; LGraphToCGraphTransformer.java:136-137
  it('a comment box without an edge compacts as a node (LEFT)', () => {
    const id = `${SITE}/commentWithoutEdge/LEFT`;
    expectNode(id, 'g0/n2', 0, 0);
    expectNode(id, 'g0/n0', 0, 40);
    expectNode(id, 'g0/n1', 50, 40);
  });

  // oracle: sites/HorizontalGraphCompactor/commentWithoutEdge/EDGE_LENGTH; NetworkSimplexCompaction.java, LGraphToCGraphTransformer.java:136-137
  it('a comment box without an edge keeps its x offset to the nodes under EDGE_LENGTH', () => {
    const id = `${SITE}/commentWithoutEdge/EDGE_LENGTH`;
    expectNode(id, 'g0/n2', 1, 0);
    expectNode(id, 'g0/n0', 1, 40);
    expectNode(id, 'g0/n1', 51, 40);
  });

  // oracle: sites/HorizontalGraphCompactor/hyperedgeFanIn/LRCL; LGraphToCGraphTransformer.java:173-183,419-425
  it('locks the sources of a fan-in on the left and the target and the shared segment on the right', () => {
    const id = `${SITE}/hyperedgeFanIn/LRCL`;
    const graph = graphBeforeCompactor(id);
    const transformer = new LGraphToCGraphTransformer();
    const cGraph = transformer.transform(graph);
    const paths = contextOf(graph);
    const nodeLocks = new Map<string, [boolean, boolean]>();
    let segments = 0;
    for (const cNode of cGraph.cNodes) {
      const lock = transformer.getLockMap().get(cNode)!;
      const origin = cNode.origin as object;
      if (origin instanceof Object && 'getPosition' in origin) {
        nodeLocks.set(paths.pathOf(origin), [lock.get(Direction.LEFT), lock.get(Direction.RIGHT)]);
      } else {
        segments++;
        // three distinct sources, one target: locked in the direction with fewer different ports (right)
        expect([lock.get(Direction.LEFT), lock.get(Direction.RIGHT)]).toEqual([false, true]);
      }
    }
    expect(segments).toBe(1);
    // sources a, b, c are g0/n2, g0/n1, g0/n0 (layer 0 of the row); the target t is g0/n3 (layer 1)
    expect(Object.fromEntries(nodeLocks)).toEqual({
      'g0/n2': [true, false],
      'g0/n1': [true, false],
      'g0/n0': [true, false],
      'g0/n3': [false, true],
    });
    // the row: sources stay at the left border (x 0), the target sits 54 right of it
    const dump = dumpOf(id);
    expect(nodePos(dump, 'g0/n2')[0]).toBe(0);
    expect(nodePos(dump, 'g0/n3')[0]).toBe(54);
    expect(recordedOf(id).layers).toEqual([['g0/n2', 'g0/n1', 'g0/n0'], ['g0/n3']]);
  });

  // oracle: scenarios/HorizontalGraphCompactor/dag-left-right-connection-locking-quadratic-orthogonal/RIGHT; LGraphToCGraphTransformer.java:173-183
  it('locks a node on the side with fewer edges and a balanced node on neither', () => {
    const id = `${SCENARIO}/dag-left-right-connection-locking-quadratic-orthogonal/RIGHT`;
    const graph = graphBeforeCompactor(id);
    const transformer = new LGraphToCGraphTransformer();
    const cGraph = transformer.transform(graph);
    const paths = contextOf(graph);
    // incoming and outgoing edges per node, from the edges the row records (a port path is `<node path>/p<k>`)
    const degree = new Map<string, { incoming: number; outgoing: number }>();
    const nodeOf = (port: string): string => port.slice(0, port.lastIndexOf('/'));
    const entry = (node: string): { incoming: number; outgoing: number } => {
      if (!degree.has(node)) {
        degree.set(node, { incoming: 0, outgoing: 0 });
      }
      return degree.get(node)!;
    };
    for (const edge of recordedOf(id).edges) {
      entry(nodeOf(edge.src!)).outgoing++;
      entry(nodeOf(edge.tgt!)).incoming++;
    }
    let balanced = 0;
    for (const cNode of cGraph.cNodes) {
      const origin = cNode.origin as object;
      if (!('getPosition' in origin)) {
        continue;
      }
      const { incoming, outgoing } = degree.get(paths.pathOf(origin))!;
      const lock = transformer.getLockMap().get(cNode)!;
      expect([lock.get(Direction.LEFT), lock.get(Direction.RIGHT)]).toEqual([incoming < outgoing, incoming > outgoing]);
      balanced += incoming === outgoing ? 1 : 0;
    }
    expect(balanced).toBeGreaterThan(0);
  });

  // oracle: full/compaction/compaction_oned-hierarchical_ports-hports1/left-right-connection-locking-quadratic-orthogonal; HorizontalGraphCompactor.java:130-138
  it('LEFT_RIGHT_CONNECTION_LOCKING keeps the hierarchical-port nodes at the recorded positions', () => {
    expectFullLayout(
      'full/compaction/compaction_oned-hierarchical_ports-hports1/left-right-connection-locking-quadratic-orthogonal',
      {
        size: [69, 76],
        nodes: [
          ['parent', 12, 12],
          ['parent/n1', 32, 15],
          ['parent/n2', 13, 36],
        ],
        edge: ['e0', []],
        labels: { e0: [12, 12], e3: [33, 39] },
      },
    );
  });

  // oracle: full/compaction/compaction_oned-hierarchical_ports-hports1/right-scanline-orthogonal; HorizontalGraphCompactor.java:117-121
  it('the RIGHT strategy compacts towards the right border', () => {
    expectFullLayout('full/compaction/compaction_oned-hierarchical_ports-hports1/right-scanline-orthogonal', {
      size: [69, 76],
      nodes: [
        ['parent', 12, 12],
        ['parent/n1', 32, 15],
        ['parent/n2', 13, 36],
      ],
      edge: ['e0', []],
      labels: { e0: [12, 12], e3: [33, 39] },
    });
  });

  // oracle: full/compaction/compaction_oned-labels-edgeLabelAndSplines/left-right-constraint-locking-scanline-orthogonal; HorizontalGraphCompactor.java:122-129
  it('LEFT_RIGHT_CONSTRAINT_LOCKING locks the nodes without out-going constraints', () => {
    expectFullLayout(
      'full/compaction/compaction_oned-labels-edgeLabelAndSplines/left-right-constraint-locking-scanline-orthogonal',
      {
        size: [104, 42],
        nodes: [
          ['N1', 12, 15],
          ['N2', 32, 15],
          ['N3', 72, 15],
          ['N4', 92, 15],
        ],
        edge: [
          'e2',
          [
            [42, 15],
            [42, 26],
            [82, 26],
            [82, 15],
          ],
        ],
        labels: { e1: [52, 12], e2: [72, 29] },
      },
    );
  });

  // oracle: full/compaction/compaction_oned-splines-moreThanOneStraightSegmentPath/edge-length-scanline-orthogonal; NetworkSimplexCompaction.java:135-139
  it('EDGE_LENGTH weights the edges between a vertical segment and a node (full layout)', () => {
    expectFullLayout(
      'full/compaction/compaction_oned-splines-moreThanOneStraightSegmentPath/edge-length-scanline-orthogonal',
      {
        size: [725, 153.99999999999997],
        nodes: [
          ['n1', 182, 92],
          ['n2', 202, 52],
          ['n3', 242, 92],
          ['n4', 262, 92],
          ['left', 12, 77.5],
          ['right', 712, 77],
          ['s1', 32, 52],
          ['s2', 202, 12],
          ['s3', 372, 52],
          ['s4', 542, 52],
        ],
        edge: [
          'e3',
          [
            [162, 77.5],
            [162, 102],
            [192, 102],
            [192, 142],
            [232, 142],
            [232, 102],
            [282, 102],
            [282, 77.66666666666667],
          ],
        ],
      },
    );
  });

  // oracle: full/compaction/compaction_oned-splines-moreThanOneStraightSegmentPath2/right-scanline-orthogonal; EdgeAwareScanlineConstraintCalculation.java:38
  it('the edge-aware scanline shrinks the hitboxes by the half spacing less epsilon (full layout)', () => {
    expectFullLayout(
      'full/compaction/compaction_oned-splines-moreThanOneStraightSegmentPath2/right-scanline-orthogonal',
      {
        size: [145, 114],
        nodes: [
          ['n1', 32, 52],
          ['n2', 52, 12],
          ['n3', 92, 52],
          ['n4', 112, 52],
          ['left', 12, 57.5],
          ['right', 132, 57],
        ],
        edge: [
          'e3',
          [
            [42, 57.5],
            [42, 62],
            [42, 62],
            [42, 102],
            [122, 102],
            [122, 62],
            [122, 62],
            [122, 57.66666666666667],
          ],
        ],
      },
    );
  });

  // oracle: sites/HorizontalGraphCompactor/hyperedgeFanIn/{LRCL,EDGE_LENGTH}; LGraphToCGraphTransformer.java:407-425
  it.each([
    ['LRCL', 40, 54, 0],
    ['EDGE_LENGTH', 41, 55, 1],
  ] as const)(
    'moves the fan-in edge and its junction point with the segment (%s)',
    (variant, segmentX, targetX, sourceX) => {
      const id = `${SITE}/hyperedgeFanIn/${variant}`;
      const dump = dumpOf(id);
      const edges = dump.geometry.edges!;
      expect(pairsOf(edges['g0/e2']!.bendPoints)).toEqual([
        [segmentX, 15],
        [segmentX, 65],
      ]);
      expect(pairsOf(edges['g0/e0']!.bendPoints)).toEqual([
        [segmentX, 115],
        [segmentX, 65],
      ]);
      expect(pairsOf(edges['g0/e2']!.junctionPoints!)).toEqual([[segmentX, 65]]);
      expect(pairsOf(recordedOf(id).geometry.edges!['g0/e2']!.junctionPoints!)).toEqual([[segmentX, 65]]);
      expect(nodePos(dump, 'g0/n3')[0]).toBe(targetX);
      expect(nodePos(dump, 'g0/n2')[0]).toBe(sourceX);
    },
  );

  // oracle: sites/HorizontalGraphCompactor/selfLoopLabel/{ORTHOGONAL,SPLINES}; LGraphToCGraphTransformer.java:487-498
  it.each([
    ['ORTHOGONAL', 150],
    ['SPLINES', 170],
  ] as const)('moves the labels of a self loop by the node shift (%s)', (variant, labelX) => {
    const id = `${SITE}/selfLoopLabel/${variant}`;
    const labels = dumpOf(id).geometry.labels as Record<string, { pos: [string, string] }>;
    const recorded = recordedOf(id).geometry.labels as Record<string, { pos: [string, string] }>;
    expect(Object.keys(labels)).toEqual(['g0/e3/l0', 'g0/e3/l1', 'g0/e3/l2']);
    const ys = Object.keys(labels).map((path) => {
      const [x, y] = labels[path]!.pos.map(decode) as [number, number];
      near(x, labelX);
      near(x, decode(recorded[path]!.pos[0]));
      near(y, decode(recorded[path]!.pos[1]));
      return y;
    });
    expect(ys).toEqual([69, 79, 89]);
  });

  // oracle: sites/HorizontalGraphCompactor/northSouthExternalPorts/{LEFT,EDGE_LENGTH}; LGraphToCGraphTransformer.java:638-660
  it.each(['LEFT', 'EDGE_LENGTH'] as const)('places the north, south, east and west external ports (%s)', (variant) => {
    const id = `${SITE}/northSouthExternalPorts/${variant}`;
    const layout = runLoopsRow(stepRowOf(id), environment).layout as {
      width: number;
      height: number;
      ports: { id: string; x: number; y: number }[];
      children: { id: string; x: number; y: number }[];
    };
    expect(layout.ports.map((port) => [port.id, port.x, port.y])).toEqual([
      ['c.p0', 62, -4],
      ['c.p1', 166, 87],
      ['c.p2', 62, 178],
      ['c.p3', -4, 87],
    ]);
    expect([layout.width, layout.height]).toEqual([166, 178]);
    const recorded = (recordedOf(id) as unknown as { layout: typeof layout }).layout;
    expect(layout.ports.map((port) => [port.x, port.y])).toEqual(recorded.ports.map((port) => [port.x, port.y]));
    expect(layout.children.map((child) => [child.id, child.x, child.y])).toEqual(
      recorded.children.map((child) => [child.id, child.x, child.y]),
    );
  });

  // oracle: sites/HorizontalGraphCompactor/invertedPorts/{west,east,both,northToEast}; NetworkSimplexCompaction.java:250-290
  it.each([
    [
      'west',
      { 'g0/n2': 1, 'g0/n1': 1, 'g0/n0': 55 },
      'g0/e0',
      [
        [41, 65],
        [41, 15],
      ],
    ],
    [
      'east',
      { 'g0/n1': 0, 'g0/n0': 54, 'g0/n2': 54 },
      'g0/e1',
      [
        [44, 15],
        [44, 65],
      ],
    ],
    [
      'both',
      { 'g0/n2': 5, 'g0/n1': 1, 'g0/n0': 59 },
      'g0/e0',
      [
        [45, 65],
        [45, 15],
      ],
    ],
  ] as const)('keeps the inverted-port edge in one group with its nodes (%s)', (variant, xs, edge, bends) => {
    const id = `${SITE}/invertedPorts/${variant}`;
    const dump = dumpOf(id);
    for (const [path, x] of Object.entries(xs)) {
      expect(nodePos(dump, path)[0]).toBe(x);
      expect(nodePos(dump, path)[0]).toBe(nodePosOfRow(id, path)[0]);
    }
    expect(pairsOf(dump.geometry.edges![edge]!.bendPoints)).toEqual(bends);
    expect(pairsOf(recordedOf(id).geometry.edges![edge]!.bendPoints)).toEqual(bends);
  });

  // oracle: sites/HorizontalGraphCompactor/invertedPorts/northToEast; NetworkSimplexCompaction.java:250-290
  it('compacts a north port routed to an east port with the recorded bend points', () => {
    const id = `${SITE}/invertedPorts/northToEast`;
    const dump = dumpOf(id);
    const bends = dump.geometry.edges!['g0/e0']!.bendPoints.map(([x, y]) => [decode(x), decode(y)]);
    expect(bends).toHaveLength(3);
    near(bends[0]![0]!, 16);
    near(bends[0]![1]!, 0);
    near(bends[1]![0]!, 95);
    near(bends[2]![0]!, 95);
    near(bends[2]![1]!, 20.666666666666664);
    near(nodePos(dump, 'g0/n2')[1], 16.333333333333332);
    near(decode(dump.geometry.graph.size[1]), 46.353333333333325);
    const recorded = pairsOf(recordedOf(id).geometry.edges!['g0/e0']!.bendPoints);
    bends.forEach(([x, y], i) => {
      near(x!, recorded[i]![0]);
      near(y!, recorded[i]![1]);
    });
  });

  // oracle: scenarios/HorizontalGraphCompactor/dag-{left,edge-length}-{scanline,quadratic}-orthogonal/RIGHT; HorizontalGraphCompactor.java:113-139
  it.each([
    ['left', 'scanline', 0, 91.03999999999999],
    ['left', 'quadratic', 0, 91],
    ['edge-length', 'scanline', 1, 91.03999999999999],
    ['edge-length', 'quadratic', 1, 91],
  ] as const)(
    '%s with %s constraints leaves the source at x %s and the graph %s high',
    (strategy, constraints, x0, height) => {
      const id = `${SCENARIO}/dag-${strategy}-${constraints}-orthogonal/RIGHT`;
      const dump = dumpOf(id);
      near(nodePos(dump, 'g0/n0')[0], x0);
      near(nodePos(dump, 'g0/n7')[0], x0 + 260);
      near(decode(dump.geometry.graph.size[0]), 290);
      near(decode(dump.geometry.graph.size[1]), height);
      near(decode(dump.geometry.graph.size[1]), decode(recordedOf(id).geometry.graph.size[1]));
    },
  );

  // oracle: scenarios/HorizontalGraphCompactor/ns-ports-left-scanline-orthogonal/RIGHT; EdgeAwareScanlineConstraintCalculation.java
  it('the edge-aware scanline folds the south segment of a north-south port edge', () => {
    const id = `${SCENARIO}/ns-ports-left-scanline-orthogonal/RIGHT`;
    const dump = dumpOf(id);
    const bends = dump.geometry.edges!['g0/e2']!.bendPoints.map(([x, y]) => [decode(x), decode(y)]);
    expect(bends).toHaveLength(4);
    near(bends[1]![0]!, 74.66666666666667);
    near(bends[2]![0]!, 74.66666666666667);
    near(bends[3]![0]!, 74.66666666666667);
    expect(bends[3]![1]).toBe(10);
    near(decode(dump.geometry.graph.size[1]), 68.04);
    const recorded = pairsOf(recordedOf(id).geometry.edges!['g0/e2']!.bendPoints);
    bends.forEach(([x, y], i) => {
      near(x!, recorded[i]![0]);
      near(y!, recorded[i]![1]);
    });
  });

  // oracle: scenarios/HorizontalGraphCompactor/comments-left-scanline-orthogonal/RIGHT; LGraphToCGraphTransformer.java:628-636
  it('puts a comment box back at its recorded offset to the node it is attached to', () => {
    const id = `${SCENARIO}/comments-left-scanline-orthogonal/RIGHT`;
    const dump = dumpOf(id);
    expect(nodePos(dump, 'g0/n6')).toEqual([0, 0]);
    expect(nodePos(dump, 'g0/n5')).toEqual([50, -65]);
    expect(nodePos(dump, 'g0/n4')).toEqual([50, 15]);
    for (const path of ['g0/n6', 'g0/n5', 'g0/n4']) {
      expect(nodePos(dump, path)).toEqual(nodePosOfRow(id, path));
    }
  });

  // oracle: scenarios/HorizontalGraphCompactor/dag-edge-length-scanline-splines/RIGHT; LGraphToCGraphTransformer.java:466-486
  it('compacts a spline layout to the recorded x positions', () => {
    const id = `${SCENARIO}/dag-edge-length-scanline-splines/RIGHT`;
    const dump = dumpOf(id);
    expect(['g0/n0', 'g0/n1', 'g0/n3', 'g0/n5', 'g0/n6', 'g0/n7'].map((path) => nodePos(dump, path)[0])).toEqual([
      0, 70, 140, 210, 280, 330,
    ]);
    expect([decode(dump.geometry.graph.size[0]), decode(dump.geometry.graph.size[1])]).toEqual([360, 91]);
  });
});

describe('compaction classes, structural (expectations from the Java)', () => {
  // LGraphToCGraphTransformer.java:202: IllegalStateException("Compaction not supported for " + style + " edges.")
  it.each([EdgeRouting.POLYLINE, EdgeRouting.UNDEFINED] as const)('rejects %s edge routing', (style) => {
    const graph = new LGraph();
    graph.setProperty(LayeredOptions.EDGE_ROUTING, style);
    expect(() => new LGraphToCGraphTransformer().transform(graph)).toThrow(
      `Compaction not supported for ${String(style)} edges.`,
    );
  });
});
