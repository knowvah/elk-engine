// SPDX-License-Identifier: EPL-2.0
import { KVector } from './KVector.js';
import { KVectorChain } from './KVectorChain.js';
import { binomiald, powd } from './ElkMathCombinatorics.js';

/**
 * Bezier section of `ElkMath`: segment and spline approximation, and the distance from a cubic
 * Bezier segment to a point.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/math/ElkMath.java
 */

/** degree of splines equation to find roots. */
const W_DEGREE = 5;
/** cubic Bezier curves. */
const DEGREE = 3;
/** precomputed "z" for cubics. */
const CUBIC_Z: readonly (readonly number[])[] = [
  [1.0, 0.6, 0.3, 0.1],
  [0.4, 0.6, 0.6, 0.4],
  [0.1, 0.3, 0.6, 1.0],
];
/** maximum depth for recursion. */
export const MAXDEPTH = 64;
/** Flatness. */
export const EPSILON = 1.0 * Math.pow(2, -MAXDEPTH - 1);

/**
 * Compute a number of approximation points on the Bezier curve defined by the given control points. The
 * degree of the curve is derived from the number of control points. The array of resulting curve points
 * includes the target point, but does not include the source point of the curve. Without a leading
 * `resultSize`, the number of approximation points is the number of control points plus one (Java's
 * `approximateBezierSegment(KVector...)`, told apart at run time by the type of the first argument).
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/math/ElkMath.java
 */
export function approximateBezierSegment(resultSize: number, ...controlPoints: KVector[]): KVector[];
export function approximateBezierSegment(...controlPoints: KVector[]): KVector[];
export function approximateBezierSegment(...args: [number, ...KVector[]] | KVector[]): KVector[] {
  if (typeof args[0] !== 'number') {
    // The number of approximation points simply equals the number of control points.
    // Although there might be more accurate approximations, this approach is the fastest.
    const points = args as KVector[];
    const approximationCount = points.length + 1;
    return approximateBezierSegment(approximationCount, ...points);
  }
  const [resultSize, ...controlPoints] = args as [number, ...KVector[]];
  if (resultSize <= 0) {
    return [];
  }
  const result: KVector[] = new Array<KVector>(resultSize);
  const dt = 1.0 / resultSize;
  let t = 0;
  for (let i = 0; i < resultSize; i++) {
    t += dt;
    result[i] = getPointOnBezierSegment(t, ...controlPoints);
  }
  return result;
}

/**
 * Compute a point on the Bezier curve defined by the given control points. The value `t` determines the
 * position of the returned point.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/math/ElkMath.java
 */
export function getPointOnBezierSegment(t: number, ...controlPoints: KVector[]): KVector {
  const n = controlPoints.length - 1;
  let px = 0;
  let py = 0;
  for (let j = 0; j <= n; j++) {
    const p = controlPoints[j];
    const factor = binomiald(n, j) * powd(1 - t, n - j) * powd(t, j);
    px += p.x * factor;
    py += p.y * factor;
  }
  return new KVector(px, py);
}

/**
 * Compute an approximation for the spline that is defined by the given control points. The control points
 * are interpreted as a series of cubic Bezier curves.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/math/ElkMath.java
 */
export function approximateBezierSpline(controlPoints: KVectorChain): KVectorChain {
  const ctrlPtCount = controlPoints.size();
  const spline = new KVectorChain();
  const controlIter = controlPoints.listIterator();
  let currentPoint = controlIter.next();
  spline.add(currentPoint);
  while (controlIter.hasNext()) {
    const remainingPoints = ctrlPtCount - controlIter.nextIndex();
    if (remainingPoints === 1) {
      spline.add(controlIter.next());
    } else if (remainingPoints === 2) {
      // calculate a quadratic bezier curve
      spline.addAll(approximateBezierSegment(currentPoint, controlIter.next(), controlIter.next()));
    } else {
      // calculate a cubic bezier curve
      const control1 = controlIter.next();
      const control2 = controlIter.next();
      const nextPoint = controlIter.next();
      spline.addAll(approximateBezierSegment(currentPoint, control1, control2, nextPoint));
      currentPoint = nextPoint;
    }
  }
  return spline;
}

/**
 * Calculate the distance from a cubic spline curve to the point `needle`.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/math/ElkMath.java
 */
export function distanceFromBezierSegment(
  start: KVector,
  c1: KVector,
  c2: KVector,
  end: KVector,
  needle: KVector,
): number {
  const tCandidate: number[] = new Array<number>(W_DEGREE).fill(0); // possible roots
  const v: KVector[] = [start, c1, c2, end];

  // convert problem to 5th-degree Bezier form
  const w = convertToBezierForm(v, needle);

  // Find all possible roots of 5th-degree equation
  const nSolutions = findRoots(w, W_DEGREE, tCandidate, 0);

  // Compare distances of P5 to all candidates, and to t=0, and t=1
  // Check distance to beginning of curve, where t = 0
  let minDistance = needle.distance(start);
  let t = 0.0;

  // Find distances for candidate points
  for (let i = 0; i < nSolutions; i++) {
    const p = bezier(v, DEGREE, tCandidate[i], null, null);
    const distance = needle.distance(p);
    if (distance < minDistance) {
      minDistance = distance;
      t = tCandidate[i];
    }
  }

  // Finally, look at distance to end point, where t = 1.0
  const distance = needle.distance(end);
  if (distance < minDistance) {
    t = 1.0;
  }

  // Return the point on the curve at parameter value t
  const pn = new KVector(bezier(v, DEGREE, t, null, null));
  return Math.sqrt(pn.distance(needle));
}

/**
 * Given a point and a Bezier curve, generate a 5th-degree Bezier-format equation whose solution finds the
 * point on the curve nearest the user-defined point.
 */
function convertToBezierForm(v: KVector[], pa: KVector): KVector[] {
  const c: KVector[] = new Array<KVector>(DEGREE + 1); // v(i) - pa
  const d: KVector[] = new Array<KVector>(DEGREE); // v(i+1) - v(i)
  const cdTable: number[][] = Array.from({ length: DEGREE }, () => new Array<number>(DEGREE + 1).fill(0)); // dot product of c, d
  const w: KVector[] = new Array<KVector>(W_DEGREE + 1); // ctl pts of 5th-degree curve

  // Determine the c's -- these are vectors created by subtracting
  // point pa from each of the control points
  for (let i = 0; i <= DEGREE; i++) {
    c[i] = new KVector(v[i].x - pa.x, v[i].y - pa.y);
  }

  // Determine the d's -- these are vectors created by subtracting
  // each control point from the next
  const s = DEGREE;
  for (let i = 0; i <= DEGREE - 1; i++) {
    d[i] = new KVector(s * (v[i + 1].x - v[i].x), s * (v[i + 1].y - v[i].y));
  }

  // Create the c,d table -- this is a table of dot products of the
  // c's and d's */
  for (let row = 0; row <= DEGREE - 1; row++) {
    for (let column = 0; column <= DEGREE; column++) {
      cdTable[row][column] = d[row].x * c[column].x + d[row].y * c[column].y;
    }
  }

  // Now, apply the z's to the dot products, on the skew diagonal
  // Also, set up the x-values, making these "points"
  for (let i = 0; i <= W_DEGREE; i++) {
    w[i] = new KVector(i / W_DEGREE, 0.0);
  }

  applySkewDiagonal(w, cdTable);
  return w;
}

/** The skew-diagonal part of `convertToBezierForm`: applies the z's to the c,d dot products. */
function applySkewDiagonal(w: KVector[], cdTable: number[][]): void {
  const n = DEGREE;
  const m = DEGREE - 1;
  for (let k = 0; k <= n + m; k++) {
    const lb = Math.max(0, k - m);
    const ub = Math.min(k, n);
    for (let i = lb; i <= ub; i++) {
      const j = k - i;
      w[i + j].y = w[i + j].y + cdTable[j][i] * CUBIC_Z[j][i];
    }
  }
}

/**
 * Given a 5th-degree equation in Bernstein-Bezier form, find all of the roots in the interval [0, 1].
 *
 * @returns the number of roots found.
 */
function findRoots(w: KVector[], degree: number, t: number[], depth: number): number {
  switch (crossingCount(w, degree)) {
    case 0: // No solutions here
      return 0;
    case 1: // Unique solution
      // Stop recursion when the tree is deep enough
      // if deep enough, return 1 solution at midpoint
      if (depth >= MAXDEPTH) {
        t[0] = (w[0].x + w[W_DEGREE].x) / 2.0;
        return 1;
      }
      if (controlPolygonFlatEnough(w, degree)) {
        t[0] = computeXIntercept(w, degree);
        return 1;
      }
      break;
    default: // nothing
  }

  // Otherwise, solve recursively after subdividing control polygon
  const left: KVector[] = new Array<KVector>(W_DEGREE + 1); // New left and right
  const right: KVector[] = new Array<KVector>(W_DEGREE + 1); // control polygons
  const leftT: number[] = new Array<number>(W_DEGREE + 1).fill(0); // Solutions from kids
  const rightT: number[] = new Array<number>(W_DEGREE + 1).fill(0);

  // start in the middle of the bezier curve, t=0.5
  bezier(w, degree, 1.0 / 2, left, right);
  const leftCount = findRoots(left, degree, leftT, depth + 1);
  const rightCount = findRoots(right, degree, rightT, depth + 1);

  gatherSolutions(t, leftT, leftCount, rightT, rightCount);

  // Send back total number of solutions */
  return leftCount + rightCount;
}

/** The "gather solutions together" part of `findRoots`. */
function gatherSolutions(t: number[], leftT: number[], leftCount: number, rightT: number[], rightCount: number): void {
  for (let i = 0; i < leftCount; i++) {
    t[i] = leftT[i];
  }
  for (let i = 0; i < rightCount; i++) {
    t[i + leftCount] = rightT[i];
  }
}

/**
 * Check if the control polygon of a Bezier curve is flat enough for recursive subdivision to bottom out.
 */
function controlPolygonFlatEnough(v: KVector[], degree: number): boolean {
  // Find the perpendicular distance from each interior control point to
  // line connecting v[0] and v[degree]

  // Derive the implicit equation for line connecting first
  // and last control points
  const a = v[0].y - v[degree].y;
  const b = v[degree].x - v[0].x;
  const c = v[0].x * v[degree].y - v[degree].x * v[0].y;

  const distance = interiorDistances(v, degree, a, b, c);

  // Find the largest distance
  const [maxDistanceAbove, maxDistanceBelow] = largestDistances(distance, degree);

  // Implicit equation for zero line
  const a1 = 0.0;
  const b1 = 1.0;
  const c1 = 0.0;

  // Implicit equation for "above" line
  let a2 = a;
  let b2 = b;
  let c2 = c + maxDistanceAbove;

  let det = a1 * b2 - a2 * b1;
  let dInv = 1.0 / det;

  const intercept1 = (b1 * c2 - b2 * c1) * dInv;

  // Implicit equation for "below" line
  a2 = a;
  b2 = b;
  c2 = c + maxDistanceBelow;

  det = a1 * b2 - a2 * b1;
  dInv = 1.0 / det;

  const intercept2 = (b1 * c2 - b2 * c1) * dInv;

  // Compute intercepts of bounding box
  const leftIntercept = Math.min(intercept1, intercept2);
  const rightIntercept = Math.max(intercept1, intercept2);

  const error = (rightIntercept - leftIntercept) / 2;

  return error < EPSILON;
}

/** The "find the largest distance" loop of `controlPolygonFlatEnough`: `[maxDistanceAbove, maxDistanceBelow]`. */
function largestDistances(distance: number[], degree: number): [number, number] {
  let maxDistanceAbove = 0.0;
  let maxDistanceBelow = 0.0;
  for (let i = 1; i < degree; i++) {
    if (distance[i] < 0.0) {
      maxDistanceBelow = Math.min(maxDistanceBelow, distance[i]);
    }
    if (distance[i] > 0.0) {
      maxDistanceAbove = Math.max(maxDistanceAbove, distance[i]);
    }
  }
  return [maxDistanceAbove, maxDistanceBelow];
}

/** The first loop of `controlPolygonFlatEnough`: signed squared distances from the interior points to the line. */
function interiorDistances(v: KVector[], degree: number, a: number, b: number, c: number): number[] {
  const abSquared = a * a + b * b;
  const distance: number[] = new Array<number>(degree + 1).fill(0); // Distances from pts to line

  for (let i = 1; i < degree; i++) {
    // Compute distance from each of the points to that line
    distance[i] = a * v[i].x + b * v[i].y + c;
    if (distance[i] > 0.0) {
      distance[i] = (distance[i] * distance[i]) / abSquared;
    }
    if (distance[i] < 0.0) {
      distance[i] = -((distance[i] * distance[i]) / abSquared);
    }
  }
  return distance;
}

/**
 * Compute intersection of chord from first control point to last with 0-axis.
 */
function computeXIntercept(v: KVector[], degree: number): number {
  const xnm = v[degree].x - v[0].x;
  const ynm = v[degree].y - v[0].y;
  const xmk = v[0].x;
  const ymk = v[0].y;

  const detInv = -1.0 / ynm;

  return (xnm * ymk - ynm * xmk) * detInv;
}

/**
 * Count the number of times a Bezier control polygon crosses the 0-axis. This number is >= the number of
 * roots.
 */
function crossingCount(v: KVector[], degree: number): number {
  let nCrossings = 0;
  let sign = v[0].y < 0 ? -1 : 1;
  let oldSign = sign;
  for (let i = 1; i <= degree; i++) {
    sign = v[i].y < 0 ? -1 : 1;
    if (sign !== oldSign) {
      nCrossings++;
    }
    oldSign = sign;
  }
  return nCrossings;
}

/**
 * Compute bezier curve.
 *
 * @param c control points
 * @param degree degree of curve
 * @param t parameter for bezier function
 */
function bezier(c: KVector[], degree: number, t: number, left: KVector[] | null, right: KVector[] | null): KVector {
  const p: KVector[][] = Array.from({ length: W_DEGREE + 1 }, () => new Array<KVector>(W_DEGREE + 1));

  for (let j = 0; j <= degree; j++) {
    p[0][j] = new KVector(c[j]);
  }

  for (let i = 1; i <= degree; i++) {
    for (let j = 0; j <= degree - i; j++) {
      p[i][j] = new KVector(
        (1.0 - t) * p[i - 1][j].x + t * p[i - 1][j + 1].x,
        (1.0 - t) * p[i - 1][j].y + t * p[i - 1][j + 1].y,
      );
    }
  }

  if (left !== null) {
    for (let j = 0; j <= degree; j++) {
      left[j] = p[j][0];
    }
  }

  if (right !== null) {
    for (let j = 0; j <= degree; j++) {
      right[j] = p[degree - j][j];
    }
  }
  return p[degree][0];
}
