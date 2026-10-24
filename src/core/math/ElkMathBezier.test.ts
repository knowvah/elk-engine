// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { approximateBezierSegment, getPointOnBezierSegment } from './ElkMathBezier.js';
import { KVector } from './KVector.js';

const DIGITS = 9;

describe('approximateBezierSegment (ElkMath.java:210-241)', () => {
  it('returns no points for a non-positive result size', () => {
    expect(approximateBezierSegment(0, new KVector(0, 0), new KVector(10, 0))).toEqual([]);
  });

  it('derives the count from the control points when no size is given', () => {
    const points = approximateBezierSegment(new KVector(0, 0), new KVector(10, 0));
    expect(points).toHaveLength(3);
    expect(points[0].x).toBeCloseTo(10 / 3, DIGITS);
    expect(points[1].x).toBeCloseTo(20 / 3, DIGITS);
    expect(points[2].x).toBeCloseTo(10, DIGITS);
  });
});

describe('getPointOnBezierSegment (ElkMath.java:253-263)', () => {
  it('interpolates a straight segment at its midpoint', () => {
    const p = getPointOnBezierSegment(0.5, new KVector(0, 0), new KVector(10, 20));
    expect([p.x, p.y]).toEqual([5, 10]);
  });
});
