// SPDX-License-Identifier: EPL-2.0
// Java-traced proof of FGraph and FParticle (mission 8b, T6; expectations read from FGraph.java and FParticle.java, the line named in the
// test name).
import { describe, expect, it } from 'vitest';
import { ForceOptions } from '../options/ForceOptions.js';
import { FBendpoint } from './FBendpoint.js';
import { FEdge } from './FEdge.js';
import { FGraph } from './FGraph.js';
import { FLabel } from './FLabel.js';
import { FNode } from './FNode.js';

/** Two nodes with ids 0 and 1 and the given edges (source id, target id, priority). */
function graphOf(edges: [number, number, number][]): { graph: FGraph; edges: FEdge[] } {
  const graph = new FGraph();
  for (const id of [0, 1]) {
    const node = new FNode(`n${String(id)}`);
    node.id = id;
    graph.getNodes().push(node);
  }
  const made = edges.map(([s, t, prio]) => {
    const edge = new FEdge();
    edge.setSource(graph.getNodes()[s]!);
    edge.setTarget(graph.getNodes()[t]!);
    edge.setProperty(ForceOptions.PRIORITY, prio);
    graph.getEdges().push(edge);
    return edge;
  });
  return { graph, edges: made };
}

describe('FGraph', () => {
  it('FGraph.java:36-45: a new graph has empty lists and no adjacency', () => {
    const graph = new FGraph();
    expect([graph.getNodes(), graph.getEdges(), graph.getLabels(), graph.getBendpoints()]).toEqual([[], [], [], []]);
    expect(graph['adjacency']).toBeNull();
  });

  it('FGraph.java:88-90: the particles are the nodes, then the labels, then the bend points, as a live view', () => {
    const { graph, edges } = graphOf([[0, 1, 1]]);
    const label = new FLabel(edges[0]!, 'l');
    graph.getLabels().push(label);
    const particles = graph.getParticles();
    const bend = new FBendpoint(edges[0]!);
    graph.getBendpoints().push(bend);
    expect([...particles]).toEqual([...graph.getNodes(), label, bend]);
  });

  it('FGraph.java:116-122: the adjacency matrix sums the priorities of the edges from row to column', () => {
    const { graph } = graphOf([
      [0, 1, 2],
      [0, 1, 3],
      [1, 0, 1],
    ]);
    graph.calcAdjacency();
    expect(graph['adjacency']).toEqual([
      [0, 5],
      [1, 0],
    ]);
  });

  it('FGraph.java:101-103: the connection of two nodes sums both directions of the adjacency', () => {
    const { graph } = graphOf([
      [0, 1, 2],
      [1, 0, 4],
    ]);
    graph.calcAdjacency();
    const [a, b] = graph.getNodes();
    expect(graph.getConnection(a!, b!)).toBe(6);
    expect(graph.getConnection(b!, a!)).toBe(6);
    expect(graph.getConnection(a!, a!)).toBe(0);
  });

  it('FGraph.java:102: the connection of two nodes before calcAdjacency dereferences a null matrix (NullPointerException, a TypeError here)', () => {
    const { graph } = graphOf([]);
    const [a, b] = graph.getNodes();
    expect(() => graph.getConnection(a!, b!)).toThrow(TypeError);
  });

  it('FGraph.java:104-109: two bend points of one edge are connected by the priority of the edge, of different edges by 0', () => {
    const { graph, edges } = graphOf([
      [0, 1, 3],
      [0, 1, 9],
    ]);
    const a = new FBendpoint(edges[0]!);
    const b = new FBendpoint(edges[0]!);
    const c = new FBendpoint(edges[1]!);
    expect(graph.getConnection(a, b)).toBe(3);
    expect(graph.getConnection(a, c)).toBe(0);
  });

  it('FGraph.java:110: a node and a bend point, or a label and a node, are not connected', () => {
    const { graph, edges } = graphOf([[0, 1, 3]]);
    const bend = new FBendpoint(edges[0]!);
    const label = new FLabel(edges[0]!, 'l');
    expect(graph.getConnection(graph.getNodes()[0]!, bend)).toBe(0);
    expect(graph.getConnection(label, graph.getNodes()[0]!)).toBe(0);
    expect(graph.getConnection(bend, graph.getNodes()[0]!)).toBe(0);
  });
});

describe('FParticle', () => {
  it('FParticle.java:34-70: position, size and displacement start at the origin and are the same vector on every call', () => {
    const node = new FNode('p');
    expect([node.getPosition().x, node.getSize().y, node.getDisplacement().x]).toEqual([0, 0, 0]);
    expect(node.getPosition()).toBe(node.getPosition());
    expect(node.getDisplacement()).not.toBe(node.getPosition());
  });

  it('FParticle.java:62-64: the radius is half the length of the size vector', () => {
    const node = new FNode('p');
    node.getSize().x = 3;
    node.getSize().y = 4;
    expect(node.getRadius()).toBe(2.5);
  });
});
