// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { NEdge } from './NEdge.js';
import { NGraph } from './NGraph.js';
import type { NNode } from './NNode.js';
import { NNode as NNodeClass } from './NNode.js';

const addNodes = (graph: NGraph, count: number): NNode[] =>
  Array.from({ length: count }, () => NNodeClass.of().create(graph));
const link = (source: NNode, target: NNode): NEdge => NEdge.of().source(source).target(target).create();

describe('NGraph', () => {
  it('starts without nodes', () => {
    expect(new NGraph().nodes).toEqual([]);
  });

  describe('makeConnected', () => {
    it('returns null and adds nothing for a connected graph', () => {
      const graph = new NGraph();
      const [a, b, c] = addNodes(graph, 3) as [NNode, NNode, NNode];
      link(a, b);
      link(c, b);
      expect(graph.makeConnected()).toBeNull();
      expect(graph.nodes).toHaveLength(3);
    });

    it('returns null for the empty graph and for a single node', () => {
      const graph = new NGraph();
      expect(graph.makeConnected()).toBeNull();
      addNodes(graph, 1);
      expect(graph.makeConnected()).toBeNull();
    });

    it('adds a root with zero edges to the first node of each component, in node order', () => {
      const graph = new NGraph();
      const [a, b, c, d, e] = addNodes(graph, 5) as [NNode, NNode, NNode, NNode, NNode];
      link(b, a);
      link(c, d);
      const root = graph.makeConnected();
      expect(root).not.toBeNull();
      expect(graph.nodes).toEqual([a, b, c, d, e, root]);
      const edges = (root as NNode).getOutgoingEdges().toArray();
      expect(edges.map((x) => x.target)).toEqual([a, c, e]);
      expect(edges.map((x) => [x.weight, x.delta])).toEqual([
        [0, 0],
        [0, 0],
        [0, 0],
      ]);
      expect((root as NNode).getIncomingEdges().size()).toBe(0);
      expect(e.getIncomingEdges().size()).toBe(1);
    });

    it('assigns internalIds by node position', () => {
      const graph = new NGraph();
      const nodes = addNodes(graph, 3);
      graph.makeConnected();
      expect(nodes.map((n) => n.internalId)).toEqual([0, 1, 2]);
    });
  });

  describe('isAcyclic', () => {
    it('accepts the empty graph and a DAG', () => {
      const graph = new NGraph();
      expect(graph.isAcyclic()).toBe(true);
      const [a, b, c] = addNodes(graph, 3) as [NNode, NNode, NNode];
      link(a, b);
      link(a, c);
      link(b, c);
      expect(graph.isAcyclic()).toBe(true);
    });

    it('rejects a graph without roots', () => {
      const graph = new NGraph();
      const [a, b] = addNodes(graph, 2) as [NNode, NNode];
      link(a, b);
      link(b, a);
      expect(graph.isAcyclic()).toBe(false);
    });

    it('rejects a cycle that is reachable from a root', () => {
      const graph = new NGraph();
      const [r, a, b] = addNodes(graph, 3) as [NNode, NNode, NNode];
      link(r, a);
      link(a, b);
      link(b, a);
      expect(graph.isAcyclic()).toBe(false);
    });
  });

  describe('writeDebugGraph', () => {
    it('builds the debug graph without writing anything and leaves the network untouched', () => {
      const graph = new NGraph();
      const [a, b] = addNodes(graph, 2) as [NNode, NNode];
      a.type = 'x';
      const edge = NEdge.of().weight(1.5).source(a).target(b).create();
      expect(graph.writeDebugGraph('/does/not/matter.elkg')).toBeUndefined();
      expect(graph.nodes).toEqual([a, b]);
      expect(a.getOutgoingEdges().toArray()).toEqual([edge]);
    });
  });
});
