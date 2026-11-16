// SPDX-License-Identifier: EPL-2.0
// Java-traced proof of FBendpoint (mission 8b, T6; expectations read from FBendpoint.java, the line named in the test name).
import { describe, expect, it } from 'vitest';
import { FBendpoint } from './FBendpoint.js';
import { FEdge } from './FEdge.js';
import { FNode } from './FNode.js';

function edge(): FEdge {
  const e = new FEdge();
  e.setSource(new FNode('a'));
  e.setTarget(new FNode('b'));
  return e;
}

describe('FBendpoint', () => {
  it('FBendpoint.java:38-40: the constructor puts the bend point into the list of its edge', () => {
    const e = edge();
    const first = new FBendpoint(e);
    const second = new FBendpoint(e);
    expect(e.getBendpoints()).toEqual([first, second]);
    expect(second.getEdge()).toBe(e);
  });

  it('FBendpoint.java:44-49: toString names the index in the edge list and the edge', () => {
    const e = edge();
    new FBendpoint(e);
    expect(new FBendpoint(e).toString()).toBe('b1[n_a->n_b]');
  });

  it('FBendpoint.java:50: a bend point no longer in the list of its edge is written without index', () => {
    const e = edge();
    const bend = new FBendpoint(e);
    e.getBendpoints().length = 0;
    expect(bend.toString()).toBe('b[n_a->n_b]');
  });
});
