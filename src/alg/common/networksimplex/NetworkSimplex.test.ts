// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { BasicProgressMonitor } from '../../../core/util/BasicProgressMonitor.js';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { NEdge } from './NEdge.js';
import { NGraph } from './NGraph.js';
import { NNode } from './NNode.js';
import { NetworkSimplex } from './NetworkSimplex.js';
import { enterEdge } from './NetworkSimplexCutValues.js';
import { exchange } from './NetworkSimplexPivot.js';
import { NetworkSimplexState } from './NetworkSimplexState.js';

const SUBTREE_THRESHOLD = 40;

const addNodes = (graph: NGraph, count: number): NNode[] =>
  Array.from({ length: count }, (_, i) => NNode.of().id(i).create(graph));
const link = (source: NNode, target: NNode, delta = 1, weight = 1): NEdge =>
  NEdge.of().source(source).target(target).delta(delta).weight(weight).create();
const layers = (nodes: NNode[]): number[] => nodes.map((n) => n.layer);

/** a->b (1), a->c (delta 3), b->c (weight 10): the initial layering puts b at 1, the optimum puts it at 2. */
function pivotGraph(): { graph: NGraph; nodes: NNode[] } {
  const graph = new NGraph();
  const nodes = addNodes(graph, 3);
  const [a, b, c] = nodes as [NNode, NNode, NNode];
  link(a, b);
  link(a, c, 3);
  link(b, c, 1, 10);
  return { graph, nodes };
}

/** a->x, x->e, a->y, a->z, a->e (delta 3): x may sit in layer 1 or 2 at equal cost. */
function balancingGraph(): { graph: NGraph; nodes: NNode[] } {
  const graph = new NGraph();
  const nodes = addNodes(graph, 5);
  const [a, x, y, z, e] = nodes as [NNode, NNode, NNode, NNode, NNode];
  link(a, x);
  link(x, e);
  link(a, y);
  link(a, z);
  link(a, e, 3);
  return { graph, nodes };
}

describe('NetworkSimplex', () => {
  it('does nothing for an empty graph but still drives the monitor', () => {
    const monitor = new BasicProgressMonitor();
    NetworkSimplex.forGraph(new NGraph()).execute(monitor);
    expect(monitor.isRunning()).toBe(false);
  });

  it('layers a graph without edges into layer 0', () => {
    const graph = new NGraph();
    const nodes = addNodes(graph, 3);
    nodes.forEach((n, i) => (n.layer = i + 7));
    NetworkSimplex.forGraph(graph).execute();
    expect(layers(nodes)).toEqual([0, 0, 0]);
  });

  it('keeps an initial tree that is already feasible and tight', () => {
    const graph = new NGraph();
    const nodes = addNodes(graph, 3);
    const [a, b, c] = nodes as [NNode, NNode, NNode];
    link(a, b);
    link(b, c, 2);
    NetworkSimplex.forGraph(graph).execute();
    expect(layers(nodes)).toEqual([0, 1, 3]);
  });

  it('moves nodes to shorten heavy edges when the initial tree is not optimal', () => {
    const { graph, nodes } = pivotGraph();
    NetworkSimplex.forGraph(graph).execute(new BasicProgressMonitor());
    expect(layers(nodes)).toEqual([0, 2, 3]);
  });

  it('stops at the initial feasible layering with an iteration limit of zero', () => {
    const { graph, nodes } = pivotGraph();
    NetworkSimplex.forGraph(graph).withIterationLimit(0).execute();
    expect(layers(nodes)).toEqual([0, 1, 3]);
  });

  it('resets an old layering before executing', () => {
    const { graph, nodes } = pivotGraph();
    nodes.forEach((n) => (n.layer = 100));
    NetworkSimplex.forGraph(graph).execute();
    expect(layers(nodes)).toEqual([0, 2, 3]);
  });

  it('can be executed twice on the same instance with the same result', () => {
    const { graph, nodes } = pivotGraph();
    const ns = NetworkSimplex.forGraph(graph);
    ns.execute();
    ns.execute();
    expect(layers(nodes)).toEqual([0, 2, 3]);
  });

  describe('balancing', () => {
    it('moves a node of equal in and out degree to the emptier layer', () => {
      const { graph, nodes } = balancingGraph();
      NetworkSimplex.forGraph(graph).withBalancing(true).execute();
      expect(layers(nodes)).toEqual([0, 2, 1, 1, 3]);
    });

    it('considers the node counts of a previous layering', () => {
      const { graph, nodes } = balancingGraph();
      NetworkSimplex.forGraph(graph).withBalancing(true).withPreviousLayering([0, 0, 5]).execute();
      expect(layers(nodes)).toEqual([0, 1, 1, 1, 3]);
    });

    it('ignores previous layering entries beyond the last layer', () => {
      const { graph, nodes } = balancingGraph();
      NetworkSimplex.forGraph(graph).withBalancing(true).withPreviousLayering([0, 0, 5, 0, 99, 99]).execute();
      expect(layers(nodes)).toEqual([0, 1, 1, 1, 3]);
    });

    it('does not shift nodes with differing in and out degree', () => {
      const graph = new NGraph();
      const nodes = addNodes(graph, 3);
      const [a, b, c] = nodes as [NNode, NNode, NNode];
      link(a, b);
      link(a, c);
      NetworkSimplex.forGraph(graph).withBalancing(true).execute();
      expect(layers(nodes)).toEqual([0, 1, 1]);
    });
  });

  describe('disconnected input', () => {
    it('fails when no edge connects the tree to the remaining nodes', () => {
      const graph = new NGraph();
      const [a, b, c, d] = addNodes(graph, 4) as [NNode, NNode, NNode, NNode];
      link(a, b);
      link(c, d, 2);
      // Java dereferences the null result of minimalSlack here (NullPointerException).
      expect(() => NetworkSimplex.forGraph(graph).execute()).toThrow(TypeError);
    });

    it('layers each component once the graph is made connected', () => {
      const graph = new NGraph();
      const nodes = addNodes(graph, 4);
      const [a, b, c, d] = nodes as [NNode, NNode, NNode, NNode];
      link(a, b);
      link(c, d, 2);
      const root = graph.makeConnected() as NNode;
      NetworkSimplex.forGraph(graph).execute();
      expect(b.layer - a.layer).toBeGreaterThanOrEqual(1);
      expect(d.layer - c.layer).toBeGreaterThanOrEqual(2);
      expect(Math.min(...graph.nodes.map((n) => n.layer))).toBe(0);
      expect(graph.nodes).toContain(root);
    });
  });

  describe('subtree removal', () => {
    function leafyGraph(): { graph: NGraph; nodes: NNode[]; outLeafs: NNode[]; inLeafs: NNode[] } {
      const graph = new NGraph();
      const nodes = addNodes(graph, 3);
      const [a, b, c] = nodes as [NNode, NNode, NNode];
      link(a, b);
      link(b, c);
      link(a, c);
      const leafCount = (SUBTREE_THRESHOLD - 3) / 2 + 1;
      const outLeafs = addNodes(graph, leafCount);
      const inLeafs = addNodes(graph, leafCount);
      outLeafs.forEach((leaf) => link(a, leaf));
      inLeafs.forEach((leaf) => link(leaf, c, 2));
      return { graph, nodes, outLeafs, inLeafs };
    }

    it('layers removed leafs relative to the node they hang from and restores the graph', () => {
      const { graph, nodes, outLeafs, inLeafs } = leafyGraph();
      const nodeCount = graph.nodes.length;
      expect(nodeCount).toBeGreaterThanOrEqual(SUBTREE_THRESHOLD);
      NetworkSimplex.forGraph(graph).execute();
      expect(layers(nodes)).toEqual([0, 1, 2]);
      expect(layers(outLeafs).every((l) => l === 1)).toBe(true);
      expect(layers(inLeafs).every((l) => l === 0)).toBe(true);
      expect(graph.nodes).toHaveLength(nodeCount);
      expect((nodes[0] as NNode).getOutgoingEdges().size()).toBe(2 + outLeafs.length);
      expect((nodes[2] as NNode).getIncomingEdges().size()).toBe(2 + inLeafs.length);
    });
  });

  describe('section guards', () => {
    it('refuses to exchange a non-tree leave edge', () => {
      const { graph } = pivotGraph();
      const state = new NetworkSimplexState(graph);
      const [first, second] = graph.nodes.flatMap((n) => [...n.getOutgoingEdges()]) as [NEdge, NEdge];
      expect(() => exchange(state, first, second)).toThrow(
        new IllegalArgumentException('Given leave edge is no tree edge.'),
      );
      expect(() => enterEdge(state, first)).toThrow(new IllegalArgumentException('The input edge is not a tree edge.'));
    });

    it('refuses to exchange for an enter edge that is a tree edge already', () => {
      const { graph } = pivotGraph();
      const state = new NetworkSimplexState(graph);
      const [first, second] = graph.nodes.flatMap((n) => [...n.getOutgoingEdges()]) as [NEdge, NEdge];
      first.treeEdge = true;
      second.treeEdge = true;
      expect(() => exchange(state, first, second)).toThrow(
        new IllegalArgumentException('Given enter edge is a tree edge already.'),
      );
    });
  });
});
