// SPDX-License-Identifier: EPL-2.0
import { ArrayIndexOutOfBoundsException } from '../../java/lang/ArrayIndexOutOfBoundsException.js';
import type { LinkedList } from '../../java/util/LinkedList.js';
import { BezierSpline } from './BezierSpline.js';
import type { ISplineInterpolator } from './ISplineInterpolator.js';
import { KVector } from './KVector.js';

/**
 * Interpolation Coefficients for even n. Address like : [m-1][k-1] for m > 7 the values for 1 <= k <= 7
 * have converged to constant values independent of m. thus, fur n >= 15 one can use the values of m = 7
 */
const INTERP_COEF_EVEN: readonly (readonly number[])[] = [
  [0.25],
  [0.2677, -0.0667],
  [0.2679, -0.0714, 0.0179],
  [0.2679, -0.0718, 0.0191, -0.0048],
  [0.2679, -0.0718, 0.0192, -0.0051, 0.0013],
  [0.2679, -0.0718, 0.0192, -0.0052, 0.0014, -0.0003],
  [0.2679, -0.0718, 0.0192, -0.0052, 0.0014, -0.0004, 0.0001],
];

/**
 * Interpolation Coefficients for odd n. Address like : [m-1][k-1]. for m > 7 the values for 1 <= k <= 7
 * have converged to constant values independent of m. thus, fur n >= 15 one can use the values of m = 7
 */
const INTERP_COEF_ODD: readonly (readonly number[])[] = [
  [0.3333],
  [0.2727, -0.0909],
  [0.2683, -0.0732, 0.0244],
  [0.268, -0.0719, 0.0196, -0.0065],
  [0.268, -0.0718, 0.0193, -0.0053, 0.0018],
  [0.2679, -0.0718, 0.0192, -0.0052, 0.0014, -0.0005],
  [0.2679, -0.0718, 0.0192, -0.0052, 0.0014, -0.0004, 0.0001],
];

/** maximal k value which is "interesting". */
const MAX_K = 7;

/** factor describing the length a in/outgoing vector is scaled. */
const TANGENT_SCALE = 0.25;

/** Reads a coefficient; Java would throw `ArrayIndexOutOfBoundsException` on a bad index. */
function coef(table: readonly (readonly number[])[], row: number, col: number): number {
  const line = table[row];
  if (line === undefined) {
    throw new ArrayIndexOutOfBoundsException(`Index ${row} out of bounds for length ${table.length}`);
  }
  const value = line[col];
  if (value === undefined) {
    throw new ArrayIndexOutOfBoundsException(`Index ${col} out of bounds for length ${line.length}`);
  }
  return value;
}

/**
 * Provides a technique to calculate a piece-wise bezier spline for a list of given points.
 *
 * As described in "Graphic Gems, Andrew Glassner (editor), Academic Press, 1990".
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/math/CubicSplineInterpolator.java
 */
export class CubicSplineInterpolator implements ISplineInterpolator {
  /**
   * Calculates a closed piecewise bezier spline where the first point is start and end.
   *
   * this function is not fully tested yet!
   *
   * @param points points being passed by the spline
   * @return piecewise bezier spline
   */
  calculateClosedBezierSpline(points: KVector[]): BezierSpline {
    const spline = new BezierSpline();

    const n = points.length;
    const even = n % 2 === 0;
    // set m depending on n even or odd.
    let m = even ? Math.trunc((n - 2) / 2) : Math.trunc((n - 1) / 2);
    m = Math.min(m, MAX_K);

    const d: KVector[] = new Array<KVector>(n);

    for (let i = 0; i < n; i++) {
      d[i] = new KVector();

      // calculate sum for every Di
      for (let k = 1; k <= m; k++) {
        const table = even ? INTERP_COEF_ODD : INTERP_COEF_EVEN;
        const a = coef(table, Math.min(m - 1, MAX_K - 1), Math.min(k - 1, MAX_K - 1));
        const plus = points[(i + k) % n] as KVector;
        const minus = points[(i - k + n) % n] as KVector;
        (d[i] as KVector).x += a * (plus.x - minus.x);
        (d[i] as KVector).y += a * (plus.y - minus.y);
      }
    }

    // add all pieces to the piecewise bezier spline
    for (let i = 0; i < n; i++) {
      const next = points[(i + 1) % n] as KVector;
      spline.addCurve(
        points[i] as KVector,
        KVector.sum(d[i] as KVector, points[i] as KVector),
        next.clone().sub(d[(i + 1) % n] as KVector),
        next,
      );
    }

    return spline;
  }

  /**
   * Calculates a piecewise bezier spline, hereby assumes, that the "head in" tangent corresponds to the
   * line from the starting point to the first point and the "head out" tangent from the n-1th point to
   * the end point.
   */
  #calculateOpenBezierSplineDefault(points: KVector[]): BezierSpline {
    const first = points[0] as KVector;
    const last = points[points.length - 1] as KVector;
    return this.#calculateOpenBezierSpline(
      points,
      (points[1] as KVector).clone().sub(first).normalize(),
      (points[points.length - 2] as KVector).clone().sub(last).normalize(),
      false,
    );
  }

  /**
   * Calculates a piecewise bezier spline.
   *
   * @param points points being passed by the spline
   * @param startTan vector describing into which direction to head out of the initial point
   * @param endTan vector describing direction to head into the final node
   * @param tangentScale if true, the tangent is scaled depending on the distance to the next ctr point,
   *   if false the tangent is used as passed
   */
  #calculateOpenBezierSpline(
    points: KVector[],
    startTan: KVector,
    endTan: KVector,
    tangentScale: boolean,
  ): BezierSpline {
    // in this case the paper talks about n-1 points, therefore it's kind of inconsistent to the
    // closed approach
    const spline = new BezierSpline();

    const n = points.length - 1;
    // t is the "extended curve" degenerating the points to a closed loop
    const t: KVector[] = new Array<KVector>(2 * n);
    const d: KVector[] = new Array<KVector>(n + 1);

    // set initial and final tangent vectors
    const [startScale, endScale] = this.#tangentScales(points, n, tangentScale);
    d[0] = startTan.clone().scale(startScale);
    d[n] = endTan.clone().scale(endScale);

    // set first and last t
    t[0] = KVector.sum(points[0] as KVector, d[0]);
    t[n] = (points[n] as KVector).clone().sub(d[n]);

    // extend t
    for (let i = 1; i < n; i++) {
      t[i] = points[i] as KVector;
      t[2 * n - i] = t[i];
    }

    this.#calculateInnerTangents(t, d, n);

    // create all bezier spline segments
    for (let i = 0; i < n; i++) {
      const bend1 = KVector.sum(points[i] as KVector, d[i] as KVector);
      const bend2 = (points[i + 1] as KVector).clone().sub(d[i + 1] as KVector);
      spline.addCurve(points[i] as KVector, bend1, bend2, points[i + 1] as KVector);
    }

    return spline;
  }

  /** Initial and final tangent scale (first part of Java's `calculateOpenBezierSpline`). */
  #tangentScales(points: KVector[], n: number, tangentScale: boolean): [number, number] {
    let startScale = 1;
    let endScale = 1;
    if (tangentScale) {
      if (points.length === 2) {
        startScale = (points[0] as KVector).distance(points[1] as KVector) * TANGENT_SCALE;
        endScale = startScale;
      } else {
        startScale = (points[0] as KVector).distance(points[1] as KVector) * TANGENT_SCALE;
        endScale = (points[n - 1] as KVector).distance(points[n] as KVector) * TANGENT_SCALE;
      }
    }
    return [startScale, endScale];
  }

  /** Calculates all Di's using the Ti's (inner part of Java's `calculateOpenBezierSpline`). */
  #calculateInnerTangents(t: KVector[], d: KVector[], n: number): void {
    // n in this case always even
    const m = Math.min(n - 1, MAX_K);

    for (let i = 1; i < n; i++) {
      const di = new KVector();
      d[i] = di;
      for (let k = 1; k <= m; k++) {
        const a = coef(INTERP_COEF_EVEN, m - 1, k - 1);
        // Ti = T-i for 0 < i < n, is it really ok to neglect 0 and n?!
        const plus = t[i + k] as KVector;
        const minus = t[Math.abs(i - k)] as KVector;
        di.x += a * (plus.x - minus.x);
        di.y += a * (plus.y - minus.y);
      }
    }
  }

  /**
   * Returns a piecewise bezier spline for the points, given as an array or a `LinkedList` (told apart
   * by `Array.isArray`). Without tangents, the "head in" tangent corresponds to the line from the
   * starting point to the first point and the "head out" tangent from the n-1th point to the end point.
   */
  interpolatePoints(points: KVector[] | LinkedList<KVector>): BezierSpline;
  interpolatePoints(
    points: KVector[] | LinkedList<KVector>,
    startVec: KVector,
    endVec: KVector,
    tangentScale: boolean,
  ): BezierSpline;
  interpolatePoints(
    points: KVector[] | LinkedList<KVector>,
    ...tangents: [] | [KVector, KVector, boolean]
  ): BezierSpline {
    const array = Array.isArray(points) ? points : points.toArray();
    if (tangents.length === 0) {
      return this.#calculateOpenBezierSplineDefault(array);
    }
    return this.#calculateOpenBezierSpline(array, tangents[0], tangents[1], tangents[2]);
  }
}
