// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { KVector } from '../../core/math/KVector.js';
import { JavaHashSet } from '../../java/util/JavaHashSet.js';
import { TEDGE_STRATEGY, TEdge } from './TEdge.js';

// KVector.hashCode = Double.hashCode(x) + Integer.reverse(Double.hashCode(y)); values hand-computed:
// (1,0) -> 0x3FF00000, (0,1) -> reverse(0x3FF00000) = 0xFFC, (2,0) -> 0x40000000, (0,2) -> reverse(0x40000000) = 2.
const H_1_0 = 1072693248;
const H_0_1 = 4092;
const H_2_0 = 1073741824;

describe('TEdge', () => {
  const p = new KVector(1, 0);
  const q = new KVector(0, 1);

  it('is equal to the same endpoints in either order', () => {
    expect(new TEdge(p, q).equals(new TEdge(new KVector(1, 0), new KVector(0, 1)))).toBe(true);
    expect(new TEdge(p, q).equals(new TEdge(q, p))).toBe(true);
    expect(new TEdge(q, p).equals(new TEdge(p, q))).toBe(true);
  });

  it('is not equal to an edge with another endpoint or to a non-edge', () => {
    expect(new TEdge(p, q).equals(new TEdge(p, new KVector(2, 0)))).toBe(false);
    expect(new TEdge(p, q).equals(new TEdge(new KVector(2, 0), q))).toBe(false);
    expect(new TEdge(p, q).equals(p)).toBe(false);
    expect(new TEdge(p, q).equals(null)).toBe(false);
  });

  it('hashes to the sum of the vertex hashes, independent of the order', () => {
    expect(new TEdge(p, q).hashCode()).toBe(H_1_0 + H_0_1);
    expect(new TEdge(q, p).hashCode()).toBe(1072697340);
  });

  it('wraps the hash sum like a Java int', () => {
    // 0x40000000 + 0x40000000 = 2^31 wraps to Integer.MIN_VALUE.
    expect(new TEdge(new KVector(2, 0), new KVector(2, 0)).hashCode()).toBe(-2147483648);
    expect(H_2_0 + H_2_0).toBe(2147483648);
  });

  it('deduplicates reversed edges in a JavaHashSet using the strategy', () => {
    const set = new JavaHashSet<TEdge>(TEDGE_STRATEGY);
    expect(set.add(new TEdge(p, q))).toBe(true);
    expect(set.add(new TEdge(q, p))).toBe(false);
    expect(set.size).toBe(1);
  });
});
