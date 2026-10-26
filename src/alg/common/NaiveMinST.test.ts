// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { KVector } from '../../core/math/KVector.js';
import type { ICostFunction } from './ICostFunction.js';
import { NaiveMinST } from './NaiveMinST.js';
import { TEdge } from './TEdge.js';
import type { Tree } from './Tree.js';

const A = new KVector(0, 0);
const B = new KVector(10, 0);
const C = new KVector(0, 3);
const D = new KVector(20, 0);
const EUCLIDEAN: ICostFunction = { cost: (e) => e.u.distance(e.v) };
const CONSTANT: ICostFunction = { cost: () => 1 };

const shape = (t: Tree<KVector>): unknown[] => [t.node, ...t.children.map(shape)];

describe('NaiveMinST.createSpanningTree', () => {
  it('picks the cheapest edge that reaches a new vertex', () => {
    const edges = [new TEdge(A, B), new TEdge(A, C), new TEdge(B, C), new TEdge(B, D)];
    expect(shape(NaiveMinST.createSpanningTree(edges, A, EUCLIDEAN))).toEqual([A, [C], [B, [D]]]);
  });

  it('keeps the input order among equal weights (stable sort)', () => {
    const forward = [new TEdge(A, B), new TEdge(A, C)];
    expect(shape(NaiveMinST.createSpanningTree(forward, A, CONSTANT))).toEqual([A, [B], [C]]);
    expect(shape(NaiveMinST.createSpanningTree([...forward].reverse(), A, CONSTANT))).toEqual([A, [C], [B]]);
  });

  it('attaches a vertex reached through the second endpoint of an edge', () => {
    expect(shape(NaiveMinST.createSpanningTree([new TEdge(B, A)], A, CONSTANT))).toEqual([A, [B]]);
  });

  it('stops when no edge reaches a new vertex', () => {
    expect(shape(NaiveMinST.createSpanningTree([new TEdge(B, D)], A, CONSTANT))).toEqual([A]);
  });

  it('runs the debug sections with an output file name', () => {
    const tree = NaiveMinST.createSpanningTree([new TEdge(A, B)], A, CONSTANT, 'minst-test-never-written');
    expect(shape(tree)).toEqual([A, [B]]);
  });
});
