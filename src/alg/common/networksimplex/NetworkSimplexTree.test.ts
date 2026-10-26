// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import * as Int32 from '../../../java/lang/Int32.js';
import * as JavaInteger from '../../../java/lang/JavaInteger.js';
import { NEdge } from './NEdge.js';
import { NGraph } from './NGraph.js';
import { NNode } from './NNode.js';
import { NetworkSimplexState } from './NetworkSimplexState.js';
import { postorderTraversal, tightTreeDFS } from './NetworkSimplexTree.js';

const SEEDS = [1, 2, 3, 7, 42, 1234, 99999, 2024];
const MAX_LAYER = 1;
const DEEP_PATH_LENGTH = 50_000;

/** Test-local seeded generator (mulberry32). */
function seededRandom(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Verbatim transcription of the recursive Java `tightTreeDFS`. */
function referenceTightTreeDFS(state: NetworkSimplexState, node: NNode): number {
  let nodeCount = 1;
  node.treeNode = true;
  let opposite: NNode | null = null;
  for (const edge of node.getConnectedEdges()) {
    if (!state.edgeVisited[edge.internalId]) {
      state.edgeVisited[edge.internalId] = true;
      opposite = edge.getOther(node);
      if (edge.treeEdge) {
        nodeCount += referenceTightTreeDFS(state, opposite as NNode);
      } else if (
        !(opposite as NNode).treeNode &&
        edge.delta === Int32.sub((edge.getTarget() as NNode).layer, (edge.getSource() as NNode).layer)
      ) {
        edge.treeEdge = true;
        state.treeEdges.add(edge);
        nodeCount += referenceTightTreeDFS(state, opposite as NNode);
      }
    }
  }
  return nodeCount;
}

/** Verbatim transcription of the recursive Java `postorderTraversal`. */
function referencePostorderTraversal(state: NetworkSimplexState, node: NNode): number {
  let lowest = JavaInteger.MAX_VALUE;
  for (const edge of node.getConnectedEdges()) {
    if (edge.treeEdge && !state.edgeVisited[edge.internalId]) {
      state.edgeVisited[edge.internalId] = true;
      lowest = Math.min(lowest, referencePostorderTraversal(state, edge.getOther(node) as NNode));
    }
  }
  state.poID[node.internalId] = state.postOrder;
  state.lowestPoID[node.internalId] = Math.min(lowest, state.postOrder++);
  return state.lowestPoID[node.internalId] as number;
}

interface Fixture {
  state: NetworkSimplexState;
  nodes: NNode[];
  edges: NEdge[];
}

/** A random graph (cycles and parallel edges allowed) with random layers and some tree edges already set. */
function buildFixture(seed: number, nodeCount: number, edgeCount: number, presetTreeEdges: boolean): Fixture {
  const random = seededRandom(seed);
  const graph = new NGraph();
  const nodes = Array.from({ length: nodeCount }, (_, i) => {
    const node = NNode.of().id(i).create(graph);
    node.internalId = i;
    node.layer = Math.floor(random() * (MAX_LAYER + 1));
    return node;
  });
  // The first edge is tight and leaves the traversal root, so every traversal reaches more than one node.
  (nodes[0] as NNode).layer = 0;
  (nodes[1] as NNode).layer = 1;
  const edges: NEdge[] = [];
  for (let i = 0; i < edgeCount; i++) {
    const source = nodes[i === 0 ? 0 : Math.floor(random() * nodeCount)] as NNode;
    // NEdge's builder rejects self-loops: pick the target among the other nodes.
    const randomTarget = nodes[(nodes.indexOf(source) + 1 + Math.floor(random() * (nodeCount - 1))) % nodeCount];
    const target = i === 0 ? (nodes[1] as NNode) : (randomTarget as NNode);
    const edge = NEdge.of().source(source).target(target).delta(1).create();
    edge.internalId = i;
    edge.treeEdge = presetTreeEdges && random() < 0.2;
    edges.push(edge);
  }
  const state = new NetworkSimplexState(graph);
  state.edges = edges;
  state.edgeVisited = new Array<boolean>(edgeCount).fill(false);
  state.poID = new Array<number>(nodeCount).fill(0);
  state.lowestPoID = new Array<number>(nodeCount).fill(0);
  state.postOrder = 1;
  return { state, nodes, edges };
}

function snapshot(fixture: Fixture): unknown {
  const { state, nodes, edges } = fixture;
  return {
    treeNodes: nodes.map((n) => n.treeNode),
    treeEdgeFlags: edges.map((e) => e.treeEdge),
    edgeVisited: [...state.edgeVisited],
    treeEdges: [...state.treeEdges].map((e) => e.internalId),
    poID: [...state.poID],
    lowestPoID: [...state.lowestPoID],
    postOrder: state.postOrder,
  };
}

describe('NetworkSimplexTree explicit-stack traversals', () => {
  for (const seed of SEEDS) {
    for (const preset of [false, true]) {
      it(`match the recursive Java shape (seed ${seed}, preset tree edges ${preset})`, () => {
        const reference = buildFixture(seed, 60, 150, preset);
        const port = buildFixture(seed, 60, 150, preset);

        const expectedCount = referenceTightTreeDFS(reference.state, reference.nodes[0] as NNode);
        const actualCount = tightTreeDFS(port.state, port.nodes[0] as NNode);
        expect(actualCount).toBe(expectedCount);
        expect(snapshot(port)).toEqual(snapshot(reference));
        expect(expectedCount).toBeGreaterThan(1);

        for (const f of [reference, port]) {
          f.state.edgeVisited.fill(false);
        }
        const expectedLowest = referencePostorderTraversal(reference.state, reference.nodes[0] as NNode);
        const actualLowest = postorderTraversal(port.state, port.nodes[0] as NNode);
        expect(actualLowest).toBe(expectedLowest);
        expect(snapshot(port)).toEqual(snapshot(reference));
        expect(port.state.postOrder).toBeGreaterThan(1);
      });
    }
  }

  it('traverses a 50,000-node path without overflowing the stack', () => {
    const graph = new NGraph();
    const nodes: NNode[] = [];
    for (let i = 0; i < DEEP_PATH_LENGTH; i++) {
      const node = NNode.of().id(i).create(graph);
      node.internalId = i;
      node.layer = i;
      nodes.push(node);
    }
    const edges: NEdge[] = [];
    for (let i = 0; i < DEEP_PATH_LENGTH - 1; i++) {
      const edge = NEdge.of()
        .source(nodes[i] as NNode)
        .target(nodes[i + 1] as NNode)
        .delta(1)
        .create();
      edge.internalId = i;
      edges.push(edge);
    }
    const state = new NetworkSimplexState(graph);
    state.edges = edges;
    state.edgeVisited = new Array<boolean>(edges.length).fill(false);
    state.poID = new Array<number>(DEEP_PATH_LENGTH).fill(0);
    state.lowestPoID = new Array<number>(DEEP_PATH_LENGTH).fill(0);
    state.postOrder = 1;

    expect(tightTreeDFS(state, nodes[0] as NNode)).toBe(DEEP_PATH_LENGTH);
    expect(state.treeEdges.size).toBe(DEEP_PATH_LENGTH - 1);

    state.edgeVisited.fill(false);
    expect(postorderTraversal(state, nodes[0] as NNode)).toBe(1);
    expect(state.poID[0]).toBe(DEEP_PATH_LENGTH);
    expect(state.poID[DEEP_PATH_LENGTH - 1]).toBe(1);
    expect(state.postOrder).toBe(DEEP_PATH_LENGTH + 1);
  });
});
