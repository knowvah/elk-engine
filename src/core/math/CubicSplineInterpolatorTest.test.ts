// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { LinkedList } from '../../java/util/LinkedList.js';
import { CubicSplineInterpolator } from './CubicSplineInterpolator.js';
import { KVector } from './KVector.js';

/** @see org.eclipse.elk.core.test/src/org/eclipse/elk/core/math/CubicSplineInterpolatorTest.java */
describe('CubicSplineInterpolatorTest', () => {
  it('calculateClosedBezierSplineTest', () => {
    // test if the endpoint of the returned BezierSpline equal to the startpoint
    let v0 = new KVector(5, 50);
    let v1 = new KVector(10, 70);
    let v2 = new KVector(30, 100);
    let v3 = new KVector(60, 70);
    let v4 = new KVector(70, 40);
    const vectors = [v0, v1, v2, v3, v4];
    let b = new CubicSplineInterpolator().calculateClosedBezierSpline(vectors);
    expect(v0.equals(b.getEndPoint())).toBe(true);

    // test horizontal aligned points
    v0 = new KVector(5, 50);
    v1 = new KVector(10, 50);
    v2 = new KVector(30, 50);
    v3 = new KVector(60, 50);
    v4 = new KVector(70, 50);
    const vectorsH = [v0, v1, v2, v3, v4];
    b = new CubicSplineInterpolator().calculateClosedBezierSpline(vectorsH);
    expect(b.getStartPoint().y).toBe(50);
    expect(b.getEndPoint().y).toBe(50);
    for (const v of b.getInnerPoints()) {
      expect(v.y).toBe(50);
    }

    // test vertical aligned points
    v0 = new KVector(100, 10);
    v1 = new KVector(100, 50);
    v2 = new KVector(100, 100);
    v3 = new KVector(100, 120);
    v4 = new KVector(100, 200);
    const vectorsV = [v0, v1, v2, v3, v4];
    b = new CubicSplineInterpolator().calculateClosedBezierSpline(vectorsV);
    expect(b.getStartPoint().x).toBe(100);
    expect(b.getEndPoint().x).toBe(100);
    for (const v of b.getInnerPoints()) {
      expect(v.x).toBe(100);
    }
  });
});

describe('CubicSplineInterpolator (additional)', () => {
  const pts = (): KVector[] => [new KVector(0, 0), new KVector(10, 0), new KVector(20, 0), new KVector(30, 0)];

  it('interpolatePoints gives equal splines for an array and a LinkedList', () => {
    const interp = new CubicSplineInterpolator();
    const fromArray = interp.interpolatePoints(pts());
    const fromList = interp.interpolatePoints(new LinkedList(pts()));
    expect(fromList.toString()).toBe(fromArray.toString());
    expect(fromArray.getCurves().size()).toBe(3);
    expect(fromArray.getStartPoint().equals(new KVector(0, 0))).toBe(true);
    expect(fromArray.getEndPoint().equals(new KVector(30, 0))).toBe(true);
  });

  it('interpolatePoints with tangents and tangentScale honours the scaled tangents', () => {
    const interp = new CubicSplineInterpolator();
    const two = [new KVector(0, 0), new KVector(8, 0)];
    const spline = interp.interpolatePoints(two, new KVector(1, 0), new KVector(-1, 0), true);
    // 2 points: startScale = endScale = 8 * 0.25 = 2; d[0] = (2,0), d[n] = (-2,0)
    const curve = spline.getCurves().getFirst();
    expect([curve.fstControlPnt.x, curve.fstControlPnt.y]).toEqual([2, 0]);
    expect([curve.sndControlPnt.x, curve.sndControlPnt.y]).toEqual([10, 0]);
  });

  it('list and array overloads agree with tangents on three points', () => {
    const interp = new CubicSplineInterpolator();
    const three = [new KVector(0, 0), new KVector(4, 4), new KVector(8, 0)];
    const a = interp.interpolatePoints(three, new KVector(0, 1), new KVector(0, 1), true);
    const b = interp.interpolatePoints(new LinkedList(three), new KVector(0, 1), new KVector(0, 1), true);
    expect(b.toString()).toBe(a.toString());
    expect(a.getCurves().size()).toBe(2);
  });
});
