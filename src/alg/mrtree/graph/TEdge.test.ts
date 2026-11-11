// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { KVectorChain } from '../../../core/math/KVectorChain.js';
import { identityHashCode } from '../../../java/lang/IdentityHashCode.js';
import { TEdge } from './TEdge.js';
import { TGraph } from './TGraph.js';
import { TGraphElement } from './TGraphElement.js';
import { TNode } from './TNode.js';

const nodes = (): { a: TNode; b: TNode; c: TNode } => {
  const graph = new TGraph();
  return { a: new TNode(0, graph, 'a'), b: new TNode(1, graph, 'b'), c: new TNode(2, graph, 'c') };
};

describe('TEdge', () => {
  it('holds source and target without touching the node lists (TEdge.java:53-56)', () => {
    const { a, b } = nodes();
    const edge = new TEdge(a, b);
    expect(edge).toBeInstanceOf(TGraphElement);
    expect(edge.getSource()).toBe(a);
    expect(edge.getTarget()).toBe(b);
    expect(a.getOutgoingEdges().size()).toBe(0);
    expect(b.getIncomingEdges().size()).toBe(0);
    expect(edge.id).toBe(0);
  });

  it('starts with no labels and an empty bend point chain (TEdge.java:31,41)', () => {
    const edge = new TEdge(null, null);
    expect(edge.getLabels().size()).toBe(0);
    expect(edge.getBendPoints()).toBeInstanceOf(KVectorChain);
    expect(edge.getBendPoints().size()).toBe(0);
  });

  it('prints source->target when both are set (TEdge.java:60-61)', () => {
    const { a, b } = nodes();
    expect(new TEdge(a, b).toString()).toBe('n_a->n_b');
  });

  it('prints e_<identity hash> otherwise: stable per edge, distinct between edges (TEdge.java:63, TR9)', () => {
    const { a } = nodes();
    const noTarget = new TEdge(a, null);
    const noSource = new TEdge(null, a);
    expect(noTarget.toString()).toBe(`e_${String(identityHashCode(noTarget))}`);
    expect(noTarget.toString()).toBe(noTarget.toString());
    expect(noTarget.toString()).not.toBe(noSource.toString());
    expect(noSource.toString()).toMatch(/^e_\d+$/);
  });

  it('setSource moves the edge between outgoing lists (TEdge.java:82-95)', () => {
    const { a, b, c } = nodes();
    const edge = new TEdge(a, c);
    a.getOutgoingEdges().add(edge);
    edge.setSource(b);
    expect(edge.getSource()).toBe(b);
    expect(a.getOutgoingEdges().size()).toBe(0);
    expect(b.getOutgoingEdges().toArray()).toEqual([edge]);
  });

  it('setSource to the current source changes nothing, and does not add the edge twice', () => {
    const { a, b } = nodes();
    const edge = new TEdge(a, b);
    edge.setSource(a);
    expect(a.getOutgoingEdges().size()).toBe(0);
    const other = new TEdge(null, b);
    other.setSource(a);
    other.setSource(a);
    expect(a.getOutgoingEdges().toArray()).toEqual([other]);
  });

  it('setSource of a source whose list lacks the edge only adds to the new list; null clears', () => {
    const { a, b } = nodes();
    const edge = new TEdge(a, b);
    edge.setSource(b);
    expect(a.getOutgoingEdges().size()).toBe(0);
    expect(b.getOutgoingEdges().toArray()).toEqual([edge]);
    edge.setSource(null);
    expect(edge.getSource()).toBeNull();
    expect(b.getOutgoingEdges().size()).toBe(0);
  });

  it('setTarget moves the edge between incoming lists (TEdge.java:109-122)', () => {
    const { a, b, c } = nodes();
    const edge = new TEdge(a, b);
    b.getIncomingEdges().add(edge);
    edge.setTarget(c);
    expect(edge.getTarget()).toBe(c);
    expect(b.getIncomingEdges().size()).toBe(0);
    expect(c.getIncomingEdges().toArray()).toEqual([edge]);
  });

  it('setTarget to the current target changes nothing; a repeated new target is listed once; null clears', () => {
    const { a, b, c } = nodes();
    const edge = new TEdge(a, b);
    edge.setTarget(b);
    expect(b.getIncomingEdges().size()).toBe(0);
    edge.setTarget(c);
    edge.setTarget(null);
    expect(edge.getTarget()).toBeNull();
    expect(c.getIncomingEdges().size()).toBe(0);
    edge.setTarget(c);
    expect(c.getIncomingEdges().toArray()).toEqual([edge]);
  });

  it('does not add an edge to a list that already contains it', () => {
    const { a, b, c } = nodes();
    const edge = new TEdge(a, b);
    c.getIncomingEdges().add(edge);
    edge.setTarget(c);
    expect(c.getIncomingEdges().size()).toBe(1);
    c.getOutgoingEdges().add(edge);
    edge.setSource(c);
    expect(c.getOutgoingEdges().size()).toBe(1);
  });
});
