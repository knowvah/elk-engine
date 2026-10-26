// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { IllegalStateException } from '../../../java/lang/IllegalStateException.js';
import { NEdge } from './NEdge.js';
import { NGraph } from './NGraph.js';
import { NNode } from './NNode.js';

const makeNodes = (): [NNode, NNode] => {
  const graph = new NGraph();
  return [NNode.of().create(graph), NNode.of().create(graph)];
};

describe('NEdge', () => {
  it('builder wires the edge into the source outgoing and target incoming lists', () => {
    const [a, b] = makeNodes();
    const edge = NEdge.of().id(3).weight(2.5).delta(4).source(a).target(b).create();
    expect(edge.getSource()).toBe(a);
    expect(edge.getTarget()).toBe(b);
    expect(a.getOutgoingEdges().toArray()).toEqual([edge]);
    expect(b.getIncomingEdges().toArray()).toEqual([edge]);
    expect(a.getIncomingEdges().size()).toBe(0);
    expect(b.getOutgoingEdges().size()).toBe(0);
    expect([edge.id, edge.weight, edge.delta]).toEqual([3, 2.5, 4]);
  });

  it('has the Java defaults: weight 0, delta 1, no origin, not a tree edge', () => {
    const [a, b] = makeNodes();
    const edge = NEdge.of(a).source(a).target(b).create();
    expect([edge.id, edge.internalId, edge.weight, edge.delta, edge.origin, edge.treeEdge]).toEqual([
      0,
      0,
      0,
      1,
      null,
      false,
    ]);
  });

  it('of(origin) ignores its argument, as the Java does', () => {
    const [a, b] = makeNodes();
    expect(NEdge.of('x').source(a).target(b).create().origin).toBeNull();
  });

  it('builder origin() stores the origin', () => {
    const [a, b] = makeNodes();
    const origin = {};
    expect(NEdge.of().origin(origin).source(a).target(b).create().origin).toBe(origin);
  });

  it('create() rejects a missing source or target', () => {
    const [a] = makeNodes();
    expect(() => NEdge.of().target(a).create()).toThrow(IllegalStateException);
    expect(() => NEdge.of().source(a).create()).toThrow('NEdge must have a source and target NNode specified.');
  });

  it('create() rejects self-loops with the edge text in the message', () => {
    const [a] = makeNodes();
    expect(() => NEdge.of().id(5).weight(1).source(a).target(a).create()).toThrow(
      /^Network simplex does not support self-loops: NEdge\[id=5 w=1\.0 d=1\] /,
    );
  });

  it('getOther returns the opposite end and rejects foreign nodes', () => {
    const [a, b] = makeNodes();
    const [c] = makeNodes();
    const edge = NEdge.of().source(a).target(b).create();
    expect(edge.getOther(a)).toBe(b);
    expect(edge.getOther(b)).toBe(a);
    expect(() => edge.getOther(c)).toThrow(IllegalArgumentException);
    expect(() => edge.getOther(c)).toThrow(/^Node .* not part of edge NEdge\[id=0 w=0\.0 d=1\]$/);
  });

  it('reverse swaps the ends and moves the edge between the node lists', () => {
    const [a, b] = makeNodes();
    const edge = NEdge.of().source(a).target(b).create();
    expect(edge.reverse()).toBe(edge);
    expect(edge.source).toBe(b);
    expect(edge.target).toBe(a);
    expect(a.getOutgoingEdges().size()).toBe(0);
    expect(b.getIncomingEdges().size()).toBe(0);
    expect(b.getOutgoingEdges().toArray()).toEqual([edge]);
    expect(a.getIncomingEdges().toArray()).toEqual([edge]);
  });

  it('toString prints id, weight and delta with Java double text', () => {
    const [a, b] = makeNodes();
    const edge = NEdge.of().id(2).weight(3).delta(-1).source(a).target(b).create();
    expect(edge.toString()).toBe('NEdge[id=2 w=3.0 d=-1]');
  });
});
