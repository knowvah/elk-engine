// SPDX-License-Identifier: EPL-2.0
// Java-traced proof of FEdge (mission 8b, T6; expectations read from FEdge.java, the line named in the test name).
import { describe, expect, it } from 'vitest';
import { FBendpoint } from './FBendpoint.js';
import { FEdge } from './FEdge.js';
import { FNode } from './FNode.js';

/** An edge from a node at (0, 0) to one at (100, 0), both 10 x 10. */
function edge(): FEdge {
  const source = new FNode('a');
  const target = new FNode('b');
  for (const n of [source, target]) {
    n.getSize().x = 10;
    n.getSize().y = 10;
  }
  target.getPosition().x = 100;
  const e = new FEdge();
  e.setSource(source);
  e.setTarget(target);
  return e;
}

describe('FEdge', () => {
  it('FEdge.java:45-47: toString joins the node texts with an arrow', () => {
    expect(edge().toString()).toBe('n_a->n_b');
  });

  it('FEdge.java:45-50: without both ends toString is e_ plus an identity hash, stable per edge', () => {
    const e = new FEdge();
    expect(e.toString()).toMatch(/^e_\d+$/);
    expect(e.toString()).toBe(e.toString());
    e.setSource(new FNode('a'));
    expect(e.toString()).toMatch(/^e_\d+$/);
  });

  it('FEdge.java:55-92: the accessors return what the setters stored and the lists start empty', () => {
    const e = edge();
    expect([e.getSource()!.getLabel(), e.getTarget()!.getLabel()]).toEqual(['a', 'b']);
    expect([e.getBendpoints(), e.getLabels()]).toEqual([[], []]);
  });

  it('FEdge.java:94-110: the docking points are where the line between the centres leaves each box', () => {
    const e = edge();
    expect([e.getSourcePoint().x, e.getSourcePoint().y]).toEqual([5, 0]);
    expect([e.getTargetPoint().x, e.getTargetPoint().y]).toEqual([95, 0]);
  });

  it('FEdge.java:136-143: the vector chain is source point, bend points in order, target point', () => {
    const e = edge();
    const first = new FBendpoint(e);
    first.getPosition().x = 30;
    first.getPosition().y = 4;
    const second = new FBendpoint(e);
    second.getPosition().x = 60;
    second.getPosition().y = 8;
    expect([...e.toVectorChain()].map((v) => [v.x, v.y])).toEqual([
      [5, 0],
      [30, 4],
      [60, 8],
      [95, 0],
    ]);
  });

  it('FEdge.java:149-163: bend points are spread evenly from source to target centre', () => {
    const e = edge();
    e.getTarget()!.getPosition().y = 40;
    e.getTarget()!.getPosition().x = 80;
    const bends = [new FBendpoint(e), new FBendpoint(e), new FBendpoint(e)];
    e.distributeBendpoints();
    expect(bends.map((b) => [b.getPosition().x, b.getPosition().y])).toEqual([
      [20, 10],
      [40, 20],
      [60, 30],
    ]);
  });

  it('FEdge.java:151: an edge without bend points distributes nothing and does not touch its nodes', () => {
    const e = new FEdge();
    e.distributeBendpoints();
    expect(e.getBendpoints()).toEqual([]);
  });
});
