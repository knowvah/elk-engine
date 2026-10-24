// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { distance, intersects2, shortestDistance } from './ElkMathGeometry.js';
import { ElkRectangle } from './ElkRectangle.js';
import { KVector } from './KVector.js';

const SIZE = 10;
const rectAt = (x: number, y: number): ElkRectangle => new ElkRectangle(x, y, SIZE, SIZE);

describe('shortestDistance (ElkMath.java:1255-1271)', () => {
  it('case 1: overlap on one axis returns the axis aligned gap', () => {
    expect(shortestDistance(rectAt(0, 0), rectAt(20, 0))).toBe(10);
  });

  it('case 2: no overlap returns the corner distance', () => {
    expect(shortestDistance(rectAt(0, 0), rectAt(20, 20))).toBeCloseTo(Math.sqrt(200), 12);
  });

  it('case 3: overlap on both axes returns the negative corner distance', () => {
    expect(shortestDistance(rectAt(0, 0), rectAt(5, 5))).toBeCloseTo(-Math.sqrt(50), 12);
  });
});

describe('intersects2 (ElkMath.java:1057-1090)', () => {
  const p = new KVector(0, 0);
  const r = new KVector(10, 0);

  it('returns the crossing point', () => {
    const hit = intersects2(p, r, new KVector(5, -5), new KVector(0, 10));
    expect([hit?.x, hit?.y]).toEqual([5, 0]);
  });

  it('returns null for parallel segments', () => {
    expect(intersects2(p, r, new KVector(0, 5), new KVector(10, 0))).toBeNull();
  });

  it('returns null when the lines cross outside the segments', () => {
    expect(intersects2(p, r, new KVector(5, 5), new KVector(0, 1))).toBeNull();
  });

  it('returns the end of the first segment for collinear overlapping segments', () => {
    const hit = intersects2(p, r, new KVector(0, 0), new KVector(10, 0));
    expect([hit?.x, hit?.y]).toEqual([10, 0]);
  });

  it('returns null for collinear segments that do not reach the center of the second', () => {
    expect(intersects2(p, r, new KVector(50, 0), new KVector(10, 0))).toBeNull();
  });
});

describe('distance (ElkMath.java:1103-1163)', () => {
  it('measures the gap between parallel segments along v', () => {
    const result = distance(
      new KVector(0, 0),
      new KVector(10, 0),
      new KVector(2, 5),
      new KVector(8, 5),
      new KVector(0, -5),
    );
    expect(result).toBe(5);
  });

  it('is infinite when v cannot reach the other segment', () => {
    const result = distance(
      new KVector(0, 0),
      new KVector(10, 0),
      new KVector(2, 5),
      new KVector(8, 5),
      new KVector(1, 0),
    );
    expect(result).toBe(Number.POSITIVE_INFINITY);
  });
});
