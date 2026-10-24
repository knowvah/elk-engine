// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { ElkMath } from './ElkMath.js';
import { ElkRectangle } from './ElkRectangle.js';
import { KVector } from './KVector.js';
import { KVectorChain } from './KVectorChain.js';

/** @see org.eclipse.elk.core.test/src/org/eclipse/elk/core/math/ElkMathTest.java */
describe('ElkMathTest (combinatorics and aggregates)', () => {
  it('testFactl', () => {
    expect(ElkMath.factl(0)).toBe(1n);
    expect(ElkMath.factl(1)).toBe(1n);
    expect(ElkMath.factl(20)).toBe(2432902008176640000n);
  });

  it('testFactlLittleIllegalArgumentException', () => {
    expect(() => ElkMath.factl(-50)).toThrow(IllegalArgumentException);
  });

  it('testFactlBigIllegalArgumentException', () => {
    expect(() => ElkMath.factl(21)).toThrow(IllegalArgumentException);
  });

  it('testFactd', () => {
    expect(ElkMath.factd(0)).toBe(1);
    expect(ElkMath.factd(1)).toBe(1);
  });

  it('testFacdlLittleIllegalArgumentException', () => {
    expect(() => ElkMath.factd(-1)).toThrow(IllegalArgumentException);
  });

  it('testBinomiall', () => {
    expect(ElkMath.binomiall(2, 0)).toBe(1n);
    expect(ElkMath.binomiall(20, 20)).toBe(1n);
    expect(ElkMath.binomiall(2, 1)).toBe(2n);
  });

  it('testBinomialllLittleIllegalArgumentException', () => {
    expect(() => ElkMath.binomiall(-1, 1)).toThrow(IllegalArgumentException);
  });

  it('testBinomiald', () => {
    expect(ElkMath.binomiald(2, 0)).toBe(1);
    expect(ElkMath.binomiald(20, 20)).toBe(1);
    expect(ElkMath.binomiald(2, 1)).toBe(2);
  });

  it('testBinomialdLittleIllegalArgumentException', () => {
    expect(() => ElkMath.binomiald(-1, 1)).toThrow(IllegalArgumentException);
  });

  it('testPow', () => {
    expect(ElkMath.powd(10, 0)).toBe(1);
    expect(ElkMath.powf(10, 0)).toBe(1);
    expect(ElkMath.powd(10, 2)).toBe(100);
    expect(ElkMath.powf(10, 2)).toBe(100);
  });

  it('testMax', () => {
    expect(ElkMath.maxi(1, 7, 5, 6)).toBe(7);
    expect(ElkMath.maxf(1, 7, 5, 6)).toBe(7);
    expect(ElkMath.maxd(1, 7, 5, 6)).toBe(7);
  });

  it('testMin', () => {
    expect(ElkMath.mini(1, 7, 5, 6)).toBe(1);
    expect(ElkMath.mini(8, 1, 9, 0)).toBe(0);
    expect(ElkMath.mini(8, 8, 8, 8)).toBe(8);
    expect(ElkMath.minf(1, 7, 5, 6)).toBe(1);
    expect(ElkMath.minf(8, 1, 9, 0)).toBe(0);
    expect(ElkMath.minf(8, 8, 8, 8)).toBe(8);
    expect(ElkMath.mind(1, 7, 5, 6)).toBe(1);
    expect(ElkMath.mind(8, 1, 9, 0)).toBe(0);
    expect(ElkMath.mind(8, 8, 8, 8)).toBe(8);
  });

  it('testAverage', () => {
    expect(ElkMath.averagel(5n, 8n, 2n, 1n)).toBe(4n);
    expect(ElkMath.averagel(5n, 0n, 2n, 1n)).toBe(2n);
    expect(ElkMath.averagef(5, 8, 2, 1)).toBe(4);
    expect(ElkMath.averagef(5, 0, 2, 1)).toBe(2);
    expect(ElkMath.averaged(5, 8, 2, 1)).toBe(4);
    expect(ElkMath.averaged(5, 0, 2, 1)).toBe(2);
  });
});

const RECT_X = 23;
const RECT_Y = 14;
const RECT_SIZE = 20;
const BEZIER_TOLERANCE = 0.000000001;
const DISTANCE_TOLERANCE = 0.01;
const APPROXIMATION_POINTS = 20;

const rect = (): ElkRectangle => new ElkRectangle(RECT_X, RECT_Y, RECT_SIZE, RECT_SIZE);

/** The path shared by testPathContains and testPathIntersects (ElkMathTest.java:61-65, :113-117). */
const innerPath = (): KVectorChain => {
  const path = new KVectorChain();
  path.add(24, 15);
  path.add(27, 20);
  path.add(39, 30);
  path.add(29, 19);
  return path;
};

/** @see org.eclipse.elk.core.test/src/org/eclipse/elk/core/math/ElkMathTest.java */
describe('ElkMathTest (geometry and Bezier)', () => {
  it('testPointContains (:26-41)', () => {
    const r = rect();
    expect(ElkMath.contains(r, new KVector(26, 19))).toBe(true);
    expect(ElkMath.contains(r, new KVector(10, 9))).toBe(false);
    expect(ElkMath.contains(r, new KVector(23, 20))).toBe(false);
    expect(ElkMath.contains(r, new KVector(23, 14))).toBe(false);
  });

  it('testLineContains (:43-53)', () => {
    const r = rect();
    expect(ElkMath.contains(r, new KVector(24, 20), new KVector(40, 32))).toBe(true);
    expect(ElkMath.contains(r, new KVector(10, 10), new KVector(40, 32))).toBe(false);
  });

  it('testPathContains (:55-79)', () => {
    const r = rect();
    const path = innerPath();
    expect(ElkMath.contains(r, path)).toBe(true);

    const path2 = new KVectorChain(path);
    path2.add(23, 14);
    expect(ElkMath.contains(r, path2)).toBe(false);

    path.add(10, 10);
    expect(ElkMath.contains(r, path)).toBe(false);
  });

  it('testLineLineIntersect (:81-104)', () => {
    const l11 = new KVector(10, 10);
    const l12 = new KVector(20, 20);

    // cross
    expect(ElkMath.intersects(l11, l12, new KVector(11, 21), new KVector(21, 11))).toBe(true);
    // touch
    expect(ElkMath.intersects(l11, l12, new KVector(10, 10), new KVector(15, 10))).toBe(false);
    // no cross
    expect(ElkMath.intersects(l11, l12, new KVector(1, 2), new KVector(2, 1))).toBe(false);
    // same line
    expect(ElkMath.intersects(l11, l12, l11.clone(), l12.clone())).toBe(false);
    expect(ElkMath.intersects(l11, l12, l12.clone(), l11.clone())).toBe(false);
    // parallel
    expect(ElkMath.intersects(l11, l12, new KVector(11, 1), new KVector(21, 21))).toBe(false);
  });

  it('testPathIntersects (:106-128)', () => {
    const r = rect();
    const path = innerPath();
    expect(ElkMath.intersects(r, path)).toBe(false);

    const path2 = new KVectorChain(path);
    path2.add(23, 14);
    expect(ElkMath.intersects(r, path2)).toBe(false);

    path.add(10, 10);
    expect(ElkMath.intersects(r, path)).toBe(true);
  });

  it('testCalcBezierPoints (:226-253)', () => {
    let result = ElkMath.approximateBezierSegment(
      APPROXIMATION_POINTS,
      new KVector(10, 10),
      new KVector(20, 20),
      new KVector(30, 30),
      new KVector(50, 50),
    );
    expect(Math.abs(result[result.length - 1].x - 50)).toBeLessThanOrEqual(BEZIER_TOLERANCE);
    expect(Math.abs(result[result.length - 1].y - 50)).toBeLessThanOrEqual(BEZIER_TOLERANCE);

    result = ElkMath.approximateBezierSegment(
      APPROXIMATION_POINTS,
      new KVector(50, 10),
      new KVector(70, 10),
      new KVector(80, 10),
      new KVector(100, 10),
    );
    for (const k of result) {
      expect(Math.abs(k.y - 10)).toBeLessThanOrEqual(BEZIER_TOLERANCE);
    }
  });

  it('testAppoximateSpline (:258-290)', () => {
    let vectors = ElkMath.approximateBezierSegment(
      APPROXIMATION_POINTS,
      new KVector(10, 10),
      new KVector(20, 20),
      new KVector(30, 30),
      new KVector(50, 50),
    );
    let result = ElkMath.approximateBezierSpline(new KVectorChain(vectors));
    const k = result.get(result.size() - 1);
    expect(Math.abs(k.x - 50)).toBeLessThanOrEqual(BEZIER_TOLERANCE);
    expect(Math.abs(k.y - 50)).toBeLessThanOrEqual(BEZIER_TOLERANCE);

    vectors = ElkMath.approximateBezierSegment(
      APPROXIMATION_POINTS,
      new KVector(50, 10),
      new KVector(70, 10),
      new KVector(80, 10),
      new KVector(100, 10),
    );
    result = ElkMath.approximateBezierSpline(new KVectorChain(vectors));
    for (const kv of result) {
      expect(Math.abs(kv.y - 10)).toBeLessThanOrEqual(BEZIER_TOLERANCE);
    }
  });

  it('testDistanceFromSpline (:295-317)', () => {
    const kvector1 = new KVector(10, 10);
    const kvector2 = new KVector(20, 20);
    const kvector3 = new KVector(30, 30);
    const kvector4 = new KVector(50, 50);
    for (const needle of [kvector4, kvector3, kvector2, kvector1]) {
      const result = ElkMath.distanceFromBezierSegment(kvector1, kvector2, kvector3, kvector4, needle);
      expect(Math.abs(result)).toBeLessThanOrEqual(DISTANCE_TOLERANCE);
    }
  });
});
