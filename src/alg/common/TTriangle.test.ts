// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { KVector } from '../../core/math/KVector.js';
import { JavaHashSet } from '../../java/util/JavaHashSet.js';
import { TEdge } from './TEdge.js';
import { TTRIANGLE_STRATEGY, TTriangle } from './TTriangle.js';

const v = (x: number, y: number): KVector => new KVector(x, y);

// Hashes hand-computed from KVector.hashCode (see TEdge.test.ts) and summed with int wrap-around.
const HASH_A = 1072697340; // (0,0) + (1,0) + (0,1) = 0 + 0x3FF00000 + 0xFFC
const HASH_B = -2147483646; // (0,0) + (2,0) + (2,2) = 0x40000000 + 0x40000002 = 2^31 + 2, wrapped
const HASH_C = 1072693250; // (1,0) + (0,2) + (0,0) = 0x3FF00000 + 2

describe('TTriangle', () => {
  // Right triangle: hypotenuse (0,0)-(2,2), so the circumcircle is centered at (1,1) with radius sqrt(2).
  const tri = new TTriangle(v(0, 0), v(2, 0), v(2, 2));

  it('keeps the vertices and builds the edges (a,b), (b,c), (c,a)', () => {
    expect(tri.vertices).toEqual([v(0, 0), v(2, 0), v(2, 2)]);
    expect(tri.tEdges.map((e) => [e.u.x, e.u.y, e.v.x, e.v.y])).toEqual([
      [0, 0, 2, 0],
      [2, 0, 2, 2],
      [2, 2, 0, 0],
    ]);
  });

  it('computes the circumcenter from the Java formula', () => {
    expect(tri.getCircumcenter().x).toBe(1);
    expect(tri.getCircumcenter().y).toBe(1);
  });

  it('tests the circumcircle with fuzziness', () => {
    expect(tri.inCircumcircle(v(1, 2.4))).toBe(true);
    expect(tri.inCircumcircle(v(3, 3))).toBe(false);
    // a vertex lies on the circle, not inside
    expect(tri.inCircumcircle(v(2, 0))).toBe(false);
    // 0.00005 inside the circle is within the fuzziness 0.0001, so it counts as on the circle
    expect(tri.inCircumcircle(v(1, 1 + Math.SQRT2 - 0.00005))).toBe(false);
    // 0.0002 inside is outside the fuzziness
    expect(tri.inCircumcircle(v(1, 1 + Math.SQRT2 - 0.0002))).toBe(true);
  });

  it('contains edges in either orientation and vertices by value', () => {
    expect(tri.contains(new TEdge(v(2, 0), v(0, 0)))).toBe(true);
    expect(tri.contains(new TEdge(v(2, 2), v(2, 0)))).toBe(true);
    expect(tri.contains(new TEdge(v(0, 0), v(2, 2)))).toBe(true);
    expect(tri.contains(new TEdge(v(0, 0), v(1, 1)))).toBe(false);
    expect(tri.contains(v(2, 2))).toBe(true);
    expect(tri.contains(v(0, 0))).toBe(true);
    expect(tri.contains(v(2, 0))).toBe(true);
    expect(tri.contains(v(1, 1))).toBe(false);
  });

  it('is equal to a triangle with the same vertices in any order', () => {
    expect(tri.equals(new TTriangle(v(2, 2), v(0, 0), v(2, 0)))).toBe(true);
    expect(new TTriangle(v(2, 2), v(0, 0), v(2, 0)).equals(tri)).toBe(true);
    expect(tri.equals(new TTriangle(v(0, 0), v(2, 0), v(3, 3)))).toBe(false);
    expect(tri.equals(v(0, 0))).toBe(false);
  });

  it('hashes to the order-independent vertex hash sum with int wrap-around', () => {
    expect(tri.hashCode()).toBe(HASH_B);
    expect(new TTriangle(v(2, 2), v(2, 0), v(0, 0)).hashCode()).toBe(HASH_B);
    expect(new TTriangle(v(0, 0), v(1, 0), v(0, 1)).hashCode()).toBe(HASH_A);
    expect(new TTriangle(v(1, 0), v(0, 2), v(0, 0)).hashCode()).toBe(HASH_C);
  });

  it('iterates a JavaHashSet in Java HashMap order for these hashes', () => {
    // table size 16, index = (h ^ h>>>16) & 15: A -> 12, B -> 2, C -> 2; the chain of bucket 2 keeps insertion order.
    const a = new TTriangle(v(0, 0), v(1, 0), v(0, 1));
    const b = new TTriangle(v(0, 0), v(2, 0), v(2, 2));
    const c = new TTriangle(v(1, 0), v(0, 2), v(0, 0));
    const set = new JavaHashSet<TTriangle>(TTRIANGLE_STRATEGY);
    for (const t of [a, c, b]) {
      set.add(t);
    }
    expect(set.add(new TTriangle(v(0, 1), v(0, 0), v(1, 0)))).toBe(false);
    expect([...set]).toEqual([c, b, a]);
  });
});
