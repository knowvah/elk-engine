// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { InternalProperties } from '../options/InternalProperties.js';
import { TEdge } from './TEdge.js';
import { TGraph } from './TGraph.js';
import { TNode } from './TNode.js';

/** a -> b, a -> c, d -> c (two parents for c), built the way the importer does (TNode lists and graph edges). */
const diamond = (): { graph: TGraph; a: TNode; b: TNode; c: TNode; d: TNode; ab: TEdge; ac: TEdge; dc: TEdge } => {
  const graph = new TGraph();
  const [a, b, c, d] = ['a', 'b', 'c', 'd'].map((label, i) => new TNode(i, graph, label)) as [
    TNode,
    TNode,
    TNode,
    TNode,
  ];
  const link = (s: TNode, t: TNode): TEdge => {
    const edge = new TEdge(s, t);
    s.getOutgoingEdges().add(edge);
    t.getIncomingEdges().add(edge);
    graph.getEdges().add(edge);
    return edge;
  };
  const ab = link(a, b);
  const ac = link(a, c);
  const dc = link(d, c);
  for (const n of [a, b, c, d]) {
    graph.getNodes().add(n);
  }
  return { graph, a, b, c, d, ab, ac, dc };
};

describe('TNode', () => {
  it('the three-argument constructor sets id, graph and label (TNode.java:58-61)', () => {
    const node = new TNode(5, new TGraph(), 'label');
    expect(node.id).toBe(5);
    expect(node.getLabel()).toBe('label');
  });

  it('the two-argument constructor leaves the label null (TNode.java:71-74)', () => {
    expect(new TNode(5, new TGraph()).getLabel()).toBeNull();
  });

  it('an explicit null label is a null label', () => {
    expect(new TNode(1, new TGraph(), null).getLabel()).toBeNull();
  });

  it('toString is n_<label>, or n_<id> for a null or empty label (TNode.java:79-83)', () => {
    const graph = new TGraph();
    expect(new TNode(3, graph, 'abc').toString()).toBe('n_abc');
    expect(new TNode(3, graph, '').toString()).toBe('n_3');
    expect(new TNode(4, graph).toString()).toBe('n_4');
  });

  it('setLabel changes label and text (TNode.java:211)', () => {
    const node = new TNode(2, new TGraph());
    node.setLabel('x');
    expect(node.getLabel()).toBe('x');
    expect(node.toString()).toBe('n_x');
    node.setLabel(null);
    expect(node.toString()).toBe('n_2');
  });

  it('getChildren walks the targets of the outgoing edges in order (TNode.java:157-178)', () => {
    const { a, b, c } = diamond();
    expect([...a.getChildren()]).toEqual([b, c]);
    expect([...b.getChildren()]).toEqual([]);
  });

  it('getParents walks the sources of the incoming edges in order (TNode.java:101-122)', () => {
    const { a, c, d } = diamond();
    expect([...c.getParents()]).toEqual([a, d]);
    expect([...a.getParents()]).toEqual([]);
  });

  it('the iterables are lazy: each iteration sees the current edge list, and can be walked again', () => {
    const { a, b, c } = diamond();
    const children = a.getChildren();
    expect([...children]).toEqual([b, c]);
    a.getOutgoingEdges().removeFirst();
    expect([...children]).toEqual([c]);
    expect([...children]).toEqual([c]);
  });

  it('the children iterator removes the edge it last returned from the outgoing list (TNode.java:171-173)', () => {
    const { a, b, c, ab, ac } = diamond();
    const iterator = a.getChildren()[Symbol.iterator]() as Iterator<TNode> & { remove(): void };
    expect(iterator.next()).toEqual({ done: false, value: b });
    iterator.remove();
    expect(a.getOutgoingEdges().toArray()).toEqual([ac]);
    expect(iterator.next()).toEqual({ done: false, value: c });
    expect(iterator.next().done).toBe(true);
    expect(ab.getTarget()).toBe(b);
  });

  it('the parents iterator removes the edge it last returned from the incoming list (TNode.java:115-117)', () => {
    const { c, a, d, dc } = diamond();
    const iterator = c.getParents()[Symbol.iterator]() as Iterator<TNode> & { remove(): void };
    expect(iterator.next().value).toBe(a);
    iterator.remove();
    expect(c.getIncomingEdges().toArray()).toEqual([dc]);
    expect(iterator.next().value).toBe(d);
    expect(iterator.next().done).toBe(true);
  });

  it('getParent is the source of the first incoming edge, null without one (TNode.java:129-135)', () => {
    const { a, c, d } = diamond();
    expect(c.getParent()).toBe(a);
    expect(a.getParent()).toBeNull();
    c.getIncomingEdges().removeFirst();
    expect(c.getParent()).toBe(d);
  });

  it('getChildrenCopy is a new list of the outgoing targets (TNode.java:143-150)', () => {
    const { a, b, c } = diamond();
    const copy = a.getChildrenCopy();
    expect(copy.toArray()).toEqual([b, c]);
    copy.clear();
    expect(a.getOutgoingEdges().size()).toBe(2);
  });

  it('getOutgoingEdges and getIncomingEdges create the list when the field is null (TNode.java:185-203)', () => {
    const node = new TNode(1, new TGraph());
    const fields = node as unknown as { outgoingEdges: unknown; incomingEdges: unknown };
    fields.outgoingEdges = null;
    fields.incomingEdges = null;
    expect(node.getOutgoingEdges().size()).toBe(0);
    expect(node.getIncomingEdges().size()).toBe(0);
    expect(node.getOutgoingEdges()).toBe(node.getOutgoingEdges());
    expect(node.getIncomingEdges()).toBe(node.getIncomingEdges());
  });

  it('addChild adds a DUMMY edge to the graph and to both nodes (TNode.java:221-227)', () => {
    const graph = new TGraph();
    const parent = new TNode(0, graph, 'p');
    const child = new TNode(1, graph, 'c');
    parent.addChild(child);
    const edge = parent.getOutgoingEdges().get(0);
    expect(edge.getSource()).toBe(parent);
    expect(edge.getTarget()).toBe(child);
    expect(edge.getProperty(InternalProperties.DUMMY)).toBe(true);
    expect(graph.getEdges().toArray()).toEqual([edge]);
    expect(child.getIncomingEdges().toArray()).toEqual([edge]);
    expect(child.getParent()).toBe(parent);
  });

  it('isLeaf is an empty outgoing list (TNode.java:236)', () => {
    const { a, b } = diamond();
    expect(a.isLeaf()).toBe(false);
    expect(b.isLeaf()).toBe(true);
  });

  it('is a shape: position, size and properties', () => {
    const node = new TNode(0, new TGraph(), 'a');
    node.getPosition().x = 3;
    node.setProperty(InternalProperties.LEVEL, 2);
    expect(node.getPosition().x).toBe(3);
    expect(node.getProperty(InternalProperties.LEVEL)).toBe(2);
  });
});
