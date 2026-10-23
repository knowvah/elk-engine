// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { ElkGraphUtil } from '../../graph/util/ElkGraphUtil.js';
import type { ElkEdge } from '../../graph/ElkEdge.js';
import type { ElkNode } from '../../graph/ElkNode.js';
import type { ElkPort } from '../../graph/ElkPort.js';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { KVector } from '../math/KVector.js';
import { ElkUtil } from './ElkUtil.js';

describe('ElkUtil.determineJunctionPoints', () => {
  // ElkUtil.java:459-560; getPoints (:869-899) first drops bend points with three equal x or y in a row
  function edgeWith(
    source: ElkNode | ElkPort,
    target: ElkNode | ElkPort,
    start: [number, number],
    bends: Array<[number, number]>,
    end: [number, number],
  ): ElkEdge {
    const edge = ElkGraphUtil.createSimpleEdge(source, target);
    const section = ElkGraphUtil.createEdgeSection(edge);
    section.setStartLocation(start[0], start[1]);
    section.setEndLocation(end[0], end[1]);
    bends.forEach(([x, y]) => ElkGraphUtil.createBendPoint(section, x, y));
    return edge;
  }

  const pointsOf = (edge: ElkEdge): Array<[number, number]> =>
    ElkUtil.determineJunctionPoints(edge)
      .toArray()
      .map((v: KVector): [number, number] => [v.x, v.y]);

  function graph(): { root: ElkNode; port: ElkPort; t1: ElkNode; t2: ElkNode } {
    const root = ElkGraphUtil.createGraph();
    const source = ElkGraphUtil.createNode(root);
    return {
      root,
      port: ElkGraphUtil.createPort(source),
      t1: ElkGraphUtil.createNode(root),
      t2: ElkGraphUtil.createNode(root),
    };
  }

  it('throws IllegalArgumentException unless the edge has exactly one section (:460-463)', () => {
    const { t1, t2 } = graph();
    const edge = ElkGraphUtil.createSimpleEdge(t1, t2);
    expect(() => ElkUtil.determineJunctionPoints(edge)).toThrow(
      new IllegalArgumentException('The edge needs to have exactly one edge section. Found: 0'),
    );
  });

  it('returns nothing when neither end is a port (:467, :471)', () => {
    const { t1, t2 } = graph();
    expect(pointsOf(edgeWith(t1, t2, [0, 0], [], [10, 10]))).toEqual([]);
  });

  it('returns nothing for a port with a single edge (:563)', () => {
    const { port, t1 } = graph();
    expect(pointsOf(edgeWith(port, t1, [0, 0], [[10, 0]], [10, 10]))).toEqual([]);
  });

  it('adds the last common point where two edges of a source port diverge (:604-607)', () => {
    const { port, t1, t2 } = graph();
    const e1 = edgeWith(
      port,
      t1,
      [0, 0],
      [
        [10, 0],
        [10, 10],
      ],
      [20, 10],
    );
    const e2 = edgeWith(
      port,
      t2,
      [0, 0],
      [
        [10, 0],
        [10, -10],
      ],
      [20, -10],
    );
    expect(pointsOf(e1)).toEqual([[10, 0]]);
    expect(pointsOf(e2)).toEqual([[10, 0]]);
  });

  it('adds p2 when the other edge continues on the same line beyond it (:594-599)', () => {
    const { port, t1, t2 } = graph();
    const e1 = edgeWith(port, t1, [0, 0], [[10, 10]], [20, 20]);
    const e2 = edgeWith(port, t2, [0, 0], [], [20, 20]);
    expect(pointsOf(e1)).toEqual([[10, 10]]);
    expect(pointsOf(e2)).toEqual([]);
  });

  it('ignores bend points on a straight axis-parallel segment (getPoints, :884-897)', () => {
    // (10, 0) is dropped from e1, so both edges are compared point by point at (20, 0) and then diverge
    const { port, t1, t2 } = graph();
    const e1 = edgeWith(
      port,
      t1,
      [0, 0],
      [
        [10, 0],
        [20, 0],
      ],
      [20, 10],
    );
    edgeWith(port, t2, [0, 0], [[20, 0]], [20, -10]);
    expect(pointsOf(e1)).toEqual([[20, 0]]);
  });

  it('stops considering an edge that ends before this one (:572-574)', () => {
    const { port, t1, t2 } = graph();
    const e1 = edgeWith(port, t1, [0, 0], [[10, 0]], [10, 10]);
    edgeWith(port, t2, [0, 0], [], [10, 0]);
    expect(pointsOf(e1)).toEqual([]);
  });

  it('compensates the offset between the coordinate systems of the edges (:554-559, :579)', () => {
    const { port, t1, t2 } = graph();
    const e1 = edgeWith(port, t1, [0, 0], [[10, 0]], [10, 10]);
    edgeWith(port, t2, [5, 5], [[15, 5]], [15, -5]);
    expect(pointsOf(e1)).toEqual([[10, 0]]);
  });

  it('traverses in reverse at a target port (:554-556, :571)', () => {
    const root = ElkGraphUtil.createGraph();
    const s1 = ElkGraphUtil.createNode(root);
    const s2 = ElkGraphUtil.createNode(root);
    const q = ElkGraphUtil.createPort(ElkGraphUtil.createNode(root));
    const e1 = edgeWith(s1, q, [0, 0], [[0, 50]], [50, 50]);
    edgeWith(s2, q, [0, 100], [[0, 50]], [50, 50]);
    expect(pointsOf(e1)).toEqual([[0, 50]]);
  });

  it('appends the source port junctions before the target port junctions (:467-473)', () => {
    const root = ElkGraphUtil.createGraph();
    const p = ElkGraphUtil.createPort(ElkGraphUtil.createNode(root));
    const q = ElkGraphUtil.createPort(ElkGraphUtil.createNode(root));
    const t2 = ElkGraphUtil.createNode(root);
    const s3 = ElkGraphUtil.createNode(root);
    const e1 = edgeWith(
      p,
      q,
      [0, 0],
      [
        [10, 0],
        [10, 10],
      ],
      [20, 10],
    );
    edgeWith(
      p,
      t2,
      [0, 0],
      [
        [10, 0],
        [10, -10],
      ],
      [20, -10],
    );
    edgeWith(s3, q, [0, 0], [[10, 10]], [20, 10]);
    expect(pointsOf(e1)).toEqual([
      [10, 0],
      [10, 10],
    ]);
  });
});
