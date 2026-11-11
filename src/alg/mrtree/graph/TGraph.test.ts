// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { MapPropertyHolder } from '../../../graph/properties/MapPropertyHolder.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { TEdge } from './TEdge.js';
import { TGraph } from './TGraph.js';
import { TNode } from './TNode.js';

describe('TGraph', () => {
  it('starts empty, as a property holder (TGraph.java:42-45)', () => {
    const graph = new TGraph();
    expect(graph).toBeInstanceOf(MapPropertyHolder);
    expect(graph.getNodes().size()).toBe(0);
    expect(graph.getEdges().size()).toBe(0);
  });

  it('returns the live node and edge lists', () => {
    const graph = new TGraph();
    const node = new TNode(0, graph, 'a');
    graph.getNodes().add(node);
    expect(graph.getNodes()).toBe(graph.getNodes());
    expect(graph.getNodes().toArray()).toEqual([node]);
    expect(graph.getEdges().toArray()).toEqual([]);
  });

  it('keeps its own lists per graph', () => {
    const a = new TGraph();
    const b = new TGraph();
    a.getNodes().add(new TNode(0, a));
    expect(b.getNodes().size()).toBe(0);
  });

  it('holds properties', () => {
    const graph = new TGraph();
    graph.setProperty(InternalProperties.GRAPH_XMAX, 12);
    expect(graph.getProperty(InternalProperties.GRAPH_XMAX)).toBe(12);
  });

  it('toString starts with "null": tmp is null before the first concatenation (TGraph.java:49-55)', () => {
    const graph = new TGraph();
    const a = new TNode(0, graph, 'a');
    const b = new TNode(1, graph, 'b');
    graph.getNodes().add(a);
    graph.getNodes().add(b);
    graph.getEdges().add(new TEdge(a, b));
    expect(graph.toString()).toBe('nulln_a\nn_b\nn_a->n_b\n');
  });

  it('toString of an empty graph is the null of Java (TGraph.java:56)', () => {
    expect(new TGraph().toString() as unknown).toBeNull();
  });
});
