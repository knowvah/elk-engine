// SPDX-License-Identifier: EPL-2.0
// Branches of StressMajorization.java that no recorded row reaches (the provider never hands over a graph of at most one node, and
// the edge index only holds edges incident to the key). Each expectation is read off the Java; the line is named in the test.
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { FEdge } from '../graph/FEdge.js';
import { FGraph } from '../graph/FGraph.js';
import { FNode } from '../graph/FNode.js';
import { Dimension } from './Dimension.js';
import { StressMajorization } from './StressMajorization.js';

/** The private members the tests look at. */
interface Internals {
  graph: unknown;
  apsp: unknown;
  getOther(edge: FEdge, one: FNode): FNode;
}
const internalsOf = (m: StressMajorization): Internals => m as unknown as Internals;

/** A graph of `count` nodes (ids 0..count-1, on the x axis, 10 apart) joined in a path. */
function pathGraph(count: number): FGraph {
  const graph = new FGraph();
  for (let i = 0; i < count; i++) {
    const node = new FNode(`n${String(i)}`);
    node.id = i;
    node.getPosition().x = 10 * i;
    graph.getNodes().push(node);
    if (i > 0) {
      const edge = new FEdge();
      edge.setSource(graph.getNodes()[i - 1]!);
      edge.setTarget(node);
      graph.getEdges().push(edge);
    }
  }
  return graph;
}

describe('StressMajorization', () => {
  it('StressMajorization.java:268: Dimension is reachable as the nested enum', () => {
    expect(StressMajorization.Dimension).toBe(Dimension);
    expect(StressMajorization.Dimension.valueOf('XY')).toBe(Dimension.XY);
  });

  it('StressMajorization.java:69-71: initialize of a graph with one node leaves the instance untouched', () => {
    const m = new StressMajorization();
    m.initialize(pathGraph(1));
    expect(internalsOf(m).graph).toBeUndefined();
    expect(internalsOf(m).apsp).toBeUndefined();
  });

  it('StressMajorization.java:108-110: execute returns at once when the initialized graph has shrunk to one node', () => {
    const graph = pathGraph(2);
    const m = new StressMajorization();
    m.initialize(graph);
    graph.getNodes().pop();
    m.execute();
    expect(graph.getNodes()[0]!.getPosition().x).toBe(0);
    expect(graph.getNodes()[0]!.getPosition().y).toBe(0);
  });

  it('StressMajorization.java:261: getOther of an edge that does not touch the node throws IllegalArgumentException', () => {
    const graph = pathGraph(3);
    const stranger = graph.getNodes()[2]!;
    const edge = graph.getEdges()[0]!;
    expect(() => internalsOf(new StressMajorization()).getOther(edge, stranger)).toThrow(
      new IllegalArgumentException("Node 'one' must be either source or target of edge 'edge'."),
    );
  });
});
