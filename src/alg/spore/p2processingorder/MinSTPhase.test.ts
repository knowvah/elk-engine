// SPDX-License-Identifier: EPL-2.0
// Proof of the processing-order phases against spore-layout.json (mission 8c, T7): the `tree` stops of every stops row, and every `minst`
// row (one NaiveMinST call: edge sequence, weights, tree with child order, the tree of the reversed edge order, order sensitivity) for
// both cost functions and both tree kinds. A row with `orderSensitive: true` is the proof that the set order is the Java's: the reversed
// edge order builds another tree there. Plus the Java asymmetry of the two phases' root (`originalVertex` against `vertex`).
import { describe, expect, it } from 'vitest';
import { BasicProgressMonitor } from '../../../core/util/BasicProgressMonitor.js';
import type { Tree } from '../../common/Tree.js';
import type { Node } from '../../common/spore/Node.js';
import { InternalProperties } from '../../common/spore/InternalProperties.js';
import { ElkGraphImporter } from '../ElkGraphImporter.js';
import { DelaunayTriangulationPhase } from '../p1structure/DelaunayTriangulationPhase.js';
import { MaxSTPhase } from './MaxSTPhase.js';
import { MinSTPhase } from './MinSTPhase.js';
import { compareTo, replayRow, type MinstCall } from '../../../../test/helpers/spore-replay-dump.js';
import { importInput } from '../../../../test/helpers/spore-replay-elk.js';
import {
  COMPACTION_ALGORITHM,
  loadSporeRows,
  onlySteps,
  STEP_TREE,
  type MinstRow,
} from '../../../../test/helpers/spore-replay-rows.js';

const stopsRows = loadSporeRows('stops');
const minstRows = loadSporeRows('minst');

describe('MinSTPhase / MaxSTPhase: tree stops', () => {
  it.each(stopsRows.map((row) => row.id))('%s: weights, root and the tree with child order equal the row', (id) => {
    const row = stopsRows.find((r) => r.id === id)!;
    const result = replayRow(row);
    expect(result.thrown).toBeNull();
    const tally = compareTo(onlySteps(row.expected.stops, [STEP_TREE]), onlySteps(result.stops, [STEP_TREE]), id);
    expect(tally.first).toBeNull();
    expect(tally.within).toBe(0);
  });
});

/** The call of a minst row: its input run once per base id (`.../i<n>` rows share one run), the call with the row's iteration. */
function callOf(row: MinstRow): MinstCall {
  const result = replayRow({ ...row, id: row.id.replace(/\/i\d+$/, '') });
  expect(result.thrown).toBeNull();
  expect(result.jitterNodes).toBe(row.expected.jitterNodes);
  const call = result.minst.find((m) => m.iteration === row.expected.iteration);
  expect(call).toBeDefined();
  return call!;
}

describe('NaiveMinST through the phases: minst rows', () => {
  it('the ref has 95 minst rows: 60 compaction (6 shapes x 5 cost functions x MIN and MAX) and 35 overlap', () => {
    expect(minstRows).toHaveLength(95);
    expect(minstRows.filter((r) => r.expected.algorithm === COMPACTION_ALGORITHM)).toHaveLength(60);
    for (const row of minstRows.filter((r) => r.expected.algorithm === COMPACTION_ALGORITHM)) {
      expect(row.id).toMatch(/-(MIN|MAX)\/i0$/);
      expect(row.expected.strategy).toBe(row.id.includes('-MAX/') ? 'MAXIMUM_SPANNING_TREE' : 'MINIMUM_SPANNING_TREE');
    }
  });

  it.each(minstRows.map((row) => row.id))(
    '%s: edge sequence, weights and tree with child order equal the row',
    (id) => {
      const row = minstRows.find((r) => r.id === id)!;
      const { algorithm, jitterNodes, ...expected } = row.expected;
      expect([algorithm, jitterNodes]).toEqual([row.expected.algorithm, 0]);
      const tally = compareTo(expected, callOf(row), id);
      expect(tally.first).toBeNull();
      expect(tally.within).toBe(0);
    },
  );

  it('an order-sensitive row builds another tree from the reversed edges; the port reproduces both trees', () => {
    const sensitive = minstRows.filter((r) => r.expected.orderSensitive);
    expect(sensitive.length).toBe(76);
    for (const row of sensitive) {
      const call = callOf(row);
      expect(call.orderSensitive).toBe(true);
      expect(call.tree).not.toEqual(call.reversedTree);
      expect(call.tree).toEqual(row.expected.tree);
      expect(call.reversedTree).toEqual(row.expected.reversedTree);
    }
  });

  it('an order-sensitive row of each kind exists: MIN and MAX, scanline set and plain triangulation set', () => {
    const sensitive = minstRows.filter((r) => r.expected.orderSensitive);
    const kinds = new Set(sensitive.map((r) => `${r.expected.strategy}/${r.expected.scanline ? 'scanline' : 'plain'}`));
    expect([...kinds].sort()).toEqual([
      'MAXIMUM_SPANNING_TREE/plain',
      'MINIMUM_SPANNING_TREE/plain',
      'MINIMUM_SPANNING_TREE/scanline',
    ]);
  });

  it('no minst row is treeified: every row is compared, none only classified', () => {
    expect(minstRows.filter((r) => r.expected.treeified)).toEqual([]);
  });
});

const nodesOf = (tree: Tree<Node>): Set<Node> => new Set([tree.node, ...tree.children.flatMap((c) => [...nodesOf(c)])]);

describe('MinSTPhase / MaxSTPhase.process', () => {
  const INPUT = {
    id: 'root',
    layoutOptions: { 'elk.algorithm': COMPACTION_ALGORITHM, 'elk.processingOrder.rootSelection': 'FIXED' },
    children: [
      { id: 'a', x: 0, y: 0, width: 20, height: 20 },
      { id: 'b', x: 100, y: 0, width: 20, height: 20 },
      { id: 'c', x: 50, y: 90, width: 20, height: 20 },
    ],
  };
  const prepared = () => {
    const graph = new ElkGraphImporter().importGraph(importInput({ input: INPUT }));
    new DelaunayTriangulationPhase().process(graph, new BasicProgressMonitor());
    return graph;
  };

  it('MinSTPhase builds the tree of Nodes from the root (first vertex when there is no preferred root)', () => {
    const graph = prepared();
    graph.preferredRoot = null;
    new MinSTPhase().process(graph, new BasicProgressMonitor());
    expect(graph.tree!.node).toBe(graph.vertices[0]);
    expect(nodesOf(graph.tree!)).toEqual(new Set(graph.vertices));
  });

  it('MaxSTPhase roots on the preferred root, or on the first vertex without one', () => {
    const graph = prepared();
    graph.preferredRoot = graph.vertices[2]!;
    new MaxSTPhase().process(graph, new BasicProgressMonitor());
    expect(graph.tree!.node).toBe(graph.vertices[2]);
    graph.preferredRoot = null;
    graph.tEdges = null;
    new DelaunayTriangulationPhase().process(graph, new BasicProgressMonitor());
    new MaxSTPhase().process(graph, new BasicProgressMonitor());
    expect(graph.tree!.node).toBe(graph.vertices[0]);
  });

  it('MinSTPhase roots on originalVertex, MaxSTPhase on vertex (kept from the Java): a moved vertex finds no edge for the max tree', () => {
    const min = prepared();
    min.vertices[0]!.vertex.add(1000, 1000);
    new MinSTPhase().process(min, new BasicProgressMonitor());
    expect(nodesOf(min.tree!).size).toBe(3);

    const max = prepared();
    max.vertices[0]!.vertex.add(1000, 1000);
    new MaxSTPhase().process(max, new BasicProgressMonitor());
    expect(max.tree!.children).toEqual([]);
  });

  it('debug mode only passes a debug file name: the tree is unchanged', () => {
    const plain = prepared();
    new MinSTPhase().process(plain, new BasicProgressMonitor());
    for (const Phase of [MinSTPhase, MaxSTPhase]) {
      const debug = prepared();
      debug.setProperty(InternalProperties.DEBUG_SVG, true);
      const reference = prepared();
      new Phase().process(debug, new BasicProgressMonitor());
      new Phase().process(reference, new BasicProgressMonitor());
      expect(nodesOf(debug.tree!)).toEqual(nodesOf(reference.tree!));
      expect(nodesOf(debug.tree!).size).toBe(3);
    }
    expect(nodesOf(plain.tree!).size).toBe(3);
  });
});
