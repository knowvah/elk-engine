// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { BezierSpline } from './BezierSpline.js';
import { BezierCurve } from './BezierSplineBezierCurve.js';
import { KVector } from './KVector.js';

const FUZZ = 0.00000001;

/** @see org.eclipse.elk.core.test/src/org/eclipse/elk/core/math/BezierSplineTest.java */
describe('BezierSplineTest', () => {
  let bs: BezierSpline;
  let startPnt: KVector;
  let fstCtrPnt: KVector;
  let sndCtrPnt: KVector;
  let endPnt: KVector;

  /** initialize a new BezierSpline with Orizantal ranged KVectors */
  function initBezierCurvehOrizontal(): void {
    startPnt = new KVector(0, 50);
    fstCtrPnt = new KVector(10, 50);
    sndCtrPnt = new KVector(20, 50);
    endPnt = new KVector(30, 50);
    bs = new BezierSpline();
    bs.addCurve(startPnt, fstCtrPnt, sndCtrPnt, endPnt);
  }

  /** initialize a new BezierSpline with Vertical ranged KVectors */
  function initBezierCurveVertical(): void {
    startPnt = new KVector(50, 0);
    fstCtrPnt = new KVector(50, 20);
    sndCtrPnt = new KVector(50, 40);
    endPnt = new KVector(50, 50);
    bs = new BezierSpline();
    bs.addCurve(startPnt, fstCtrPnt, sndCtrPnt, endPnt);
  }

  it('testGetStartPoint', () => {
    initBezierCurveVertical();
    let v = bs.getStartPoint();
    expect(v.x).toBe(startPnt.x);
    expect(v.y).toBe(startPnt.y);
    initBezierCurvehOrizontal();
    v = bs.getStartPoint();
    expect(v.x).toBe(startPnt.x);
    expect(v.y).toBe(startPnt.y);
  });

  it('testGetEndPoint', () => {
    initBezierCurveVertical();
    let v = bs.getEndPoint();
    expect(v.x).toBe(endPnt.x);
    expect(v.y).toBe(endPnt.y);
    initBezierCurvehOrizontal();
    v = bs.getEndPoint();
    expect(v.x).toBe(endPnt.x);
    expect(v.y).toBe(endPnt.y);
  });

  it('testGetInnerPoints', () => {
    initBezierCurveVertical();
    let vectors = bs.getInnerPoints();
    expect(vectors).toHaveLength(2);
    for (const v of vectors) {
      expect(Math.abs(v.x - startPnt.x)).toBeLessThanOrEqual(FUZZ);
    }
    initBezierCurvehOrizontal();
    vectors = bs.getInnerPoints();
    for (const v of vectors) {
      expect(Math.abs(v.y - startPnt.y)).toBeLessThanOrEqual(FUZZ);
    }
  });

  it('testGetBasePoints', () => {
    initBezierCurveVertical();
    let vectors = bs.getBasePoints();
    expect(vectors).toHaveLength(2);
    for (const v of vectors) {
      expect(Math.abs(v.x - startPnt.x)).toBeLessThanOrEqual(FUZZ);
    }
    initBezierCurvehOrizontal();
    vectors = bs.getBasePoints();
    for (const v of vectors) {
      expect(Math.abs(v.y - startPnt.y)).toBeLessThanOrEqual(FUZZ);
    }
  });

  it('testGetPolylineApprx', () => {
    initBezierCurveVertical();
    let vectors = bs.getPolylineApprx(50);
    expect(vectors).toHaveLength(51);
    for (const v of vectors) {
      expect(Math.abs(v.x - startPnt.x)).toBeLessThanOrEqual(FUZZ);
    }
    initBezierCurvehOrizontal();
    vectors = bs.getPolylineApprx(50);
    for (const v of vectors) {
      expect(Math.abs(v.y - startPnt.y)).toBeLessThanOrEqual(FUZZ);
    }
  });
});

describe('BezierSpline (additional)', () => {
  const curve = (x: number): BezierCurve =>
    new BezierCurve(new KVector(x, 0), new KVector(x, 1), new KVector(x, 2), new KVector(x, 3));

  it('toString lists each curve on its own line', () => {
    const bs = new BezierSpline();
    bs.addCurve(new KVector(0, 0), new KVector(1, 1), new KVector(2, 2), new KVector(3, 3));
    expect(bs.toString()).toBe('(0.0,0.0) -> (1.0,1.0) -> (2.0,2.0) -> (3.0,3.0)\n');
  });

  it('addSpline at the beginning prepends, at the end appends', () => {
    const a = curve(1);
    const b = curve(2);
    const c = curve(3);
    const base = new BezierSpline();
    base.addCurve(b);
    const other = new BezierSpline();
    other.addCurve(a);
    other.addCurve(c);

    const front = new BezierSpline();
    front.addCurve(b);
    front.addSpline(other, true);
    expect(front.getCurves().toArray()).toEqual([a, c, b]);

    base.addSpline(other, false);
    expect(base.getCurves().toArray()).toEqual([b, a, c]);
  });

  it('getInnerPoints of an empty spline is empty; of two curves has 5 points', () => {
    const bs = new BezierSpline();
    expect(bs.getInnerPoints()).toEqual([]);
    bs.addCurve(curve(1));
    bs.addCurve(curve(2));
    const inner = bs.getInnerPoints();
    expect(inner).toHaveLength(5);
    expect(inner.map((v) => [v.x, v.y])).toEqual([
      [1, 1],
      [1, 2],
      [1, 3],
      [2, 1],
      [2, 2],
    ]);
  });

  it('BezierCurve exposes vector list and array in start, controls, end order', () => {
    const c = curve(4);
    expect(c.asArray()).toEqual([c.start, c.fstControlPnt, c.sndControlPnt, c.end]);
    expect(c.asVectorList()).toEqual(c.asArray());
  });
});
