// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { KVector } from '../../core/math/KVector.js';
import { JavaHashSet } from '../../java/util/JavaHashSet.js';
import { POINT_STRATEGY, Point } from './Point.js';
import { Quadrant } from './PointQuadrant.js';

describe('Point', () => {
  it('has the Java defaults', () => {
    const p = new Point(1, 2);
    expect(p.quadrant).toBeNull();
    expect(p.convex).toBe(true);
  });

  it('takes an optional quadrant', () => {
    expect(new Point(1, 2, Quadrant.Q3).quadrant).toBe(Quadrant.Q3);
  });

  it('copies a KVector', () => {
    const p = Point.from(new KVector(3, 4));
    expect([p.x, p.y]).toEqual([3, 4]);
  });

  it('prints like Java', () => {
    expect(new Point(1, 2).toString()).toBe('(1.0, 2.0cxnull)');
    const q = new Point(1.5, -2, Quadrant.Q2);
    q.convex = false;
    expect(q.toString()).toBe('(1.5, -2.0Q2)');
  });

  it('compares the boxed doubles', () => {
    expect(new Point(1, 2).equals(new Point(1, 2, Quadrant.Q1))).toBe(true);
    expect(new Point(1, 2).equals(new Point(1, 3))).toBe(false);
    expect(new Point(0, 0).equals(new Point(-0, 0))).toBe(false);
    expect(new Point(NaN, 0).equals(new Point(NaN, 0))).toBe(true);
    expect(new Point(1, 2).equals(null)).toBe(false);
    expect(new Point(1, 2).equals(undefined)).toBe(false);
    expect(new Point(1, 2).equals(new KVector(1, 2))).toBe(false);
  });

  it('hashes like Objects.hash(x, y)', () => {
    // 31 * (31 * 1 + Double.hashCode(x)) + Double.hashCode(y), hand-computed with int wrap-around.
    expect(new Point(0, 0).hashCode()).toBe(961);
    expect(new Point(1, 2).hashCode()).toBe(-32504895);
    expect(new Point(-0, 0).hashCode()).toBe(-2147482687);
  });

  it('works as a set key through the strategy', () => {
    const set = new JavaHashSet<Point>(POINT_STRATEGY);
    set.add(new Point(1, 2));
    expect(set.add(new Point(1, 2))).toBe(false);
    expect(set.size).toBe(1);
  });
});

describe('Quadrant', () => {
  it('keeps the declaration order Q1, Q4, Q2, Q3', () => {
    expect(Quadrant.values().map((q) => q.name())).toEqual(['Q1', 'Q4', 'Q2', 'Q3']);
    expect(Quadrant.values().map((q) => q.ordinal())).toEqual([0, 1, 2, 3]);
    expect(Quadrant.Q2.compareTo(Quadrant.Q4)).toBe(1);
    expect(String(Quadrant.Q3)).toBe('Q3');
  });

  it('looks constants up by name', () => {
    expect(Quadrant.valueOf('Q4')).toBe(Quadrant.Q4);
    expect(() => Quadrant.valueOf('Q5')).toThrow('No enum constant org.eclipse.elk.alg.common.Point.Quadrant.Q5');
  });

  it('knows upper and left', () => {
    expect(Quadrant.values().map((q) => q.isUpper())).toEqual([true, false, true, false]);
    expect(Quadrant.values().map((q) => q.isLeft())).toEqual([true, true, false, false]);
  });

  it('pairs quadrants on the same side or on opposite sides', () => {
    const { Q1, Q2, Q3, Q4 } = Quadrant;
    const pairs: [Quadrant, Quadrant][] = [];
    for (const a of Quadrant.values()) {
      for (const b of Quadrant.values()) {
        pairs.push([a, b]);
      }
    }
    const both = pairs.filter(([a, b]) => Quadrant.isBothLeftOrBothRight(a, b)).map(([a, b]) => `${a}${b}`);
    expect(both).toEqual(['Q1Q4', 'Q4Q1', 'Q2Q3', 'Q3Q2']);
    const one = pairs.filter(([a, b]) => Quadrant.isOneLeftOneRight(a, b)).map(([a, b]) => `${a}${b}`);
    expect(one).toEqual(['Q1Q2', 'Q1Q3', 'Q4Q2', 'Q4Q3']);
    expect(Quadrant.isOneLeftOneRight(Q2, Q1)).toBe(false);
    expect(Quadrant.isBothLeftOrBothRight(Q1, Q1)).toBe(false);
    expect(Quadrant.isBothLeftOrBothRight(Q3, Q4)).toBe(false);
  });
});
