// SPDX-License-Identifier: EPL-2.0
import { fuzzyCompare, fuzzyEquals } from '../../guava/DoubleMath.js';
import type { ElkRectangle } from './ElkRectangle.js';
import { KVector } from './KVector.js';
import { KVectorChain } from './KVectorChain.js';

/**
 * Geometry section of `ElkMath`: line, path and rectangle intersection, containment and distances.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/math/ElkMath.java
 */

/**
 * Double computations are potentially imprecise, we need a robust way of checking if a value is zero in
 * {@link intersects}, which is done using an epsilon comparison. Note that other algorithms may use this
 * epsilon and depend on its value being no less than 0.00001.
 */
const DOUBLE_EQ_EPSILON = 0.00001;

/**
 * Checks whether any of the four borders of `rect` intersects with any of the straight line segments of the
 * closed `path = p_1,...,p_n` (also the closing segment), or whether the straight line `(p1, p2)` intersects
 * one of the four segments of `rect`, or whether the two lines `(l11, l12)` and `(l21, l22)` intersect. The
 * Java overloads are told apart by arity and the type of the second argument.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/math/ElkMath.java
 */
export function intersects(rect: ElkRectangle, path: KVectorChain): boolean;
export function intersects(rect: ElkRectangle, p1: KVector, p2: KVector): boolean;
export function intersects(l11: KVector, l12: KVector, l21: KVector, l22: KVector): boolean;
export function intersects(
  first: ElkRectangle | KVector,
  second: KVectorChain | KVector,
  third?: KVector,
  fourth?: KVector,
): boolean {
  if (fourth !== undefined) {
    return intersectsLines(first as KVector, second as KVector, third as KVector, fourth);
  }
  if (third !== undefined) {
    return intersectsRectLine(first as ElkRectangle, second as KVector, third);
  }
  return intersectsRectPath(first as ElkRectangle, second as KVectorChain);
}

function intersectsRectPath(rect: ElkRectangle, path: KVectorChain): boolean {
  if (path.size() < 2) {
    return false;
  }

  const pathIt = path.listIterator();
  const first = pathIt.next();
  let p1 = first;
  // check every segment
  while (pathIt.hasNext()) {
    const p2 = pathIt.next();
    if (intersectsRectLine(rect, p1, p2)) {
      return true;
    }
    p1 = p2;
  }
  // check the closing segment
  if (intersectsRectLine(rect, p1, first)) {
    return true;
  }

  return false;
}

function intersectsRectLine(rect: ElkRectangle, p1: KVector, p2: KVector): boolean {
  // simple cases first: fully contained
  if (containsLine(rect, p1, p2)) {
    return false;
  }
  // leaves the cases
  //  - where one point is inside and the other outside (don't use contains here, as point on border is 'outside')
  //  - where both points are outside
  // for that, check if (p1, p2) intersects with one of rect's borders
  return (
    intersectsLines(rect.getTopLeft(), rect.getTopRight(), p1, p2) ||
    intersectsLines(rect.getTopRight(), rect.getBottomRight(), p1, p2) ||
    intersectsLines(rect.getBottomRight(), rect.getBottomLeft(), p1, p2) ||
    intersectsLines(rect.getBottomLeft(), rect.getTopLeft(), p1, p2)
  );
}

function intersectsLines(l11: KVector, l12: KVector, l21: KVector, l22: KVector): boolean {
  const u0 = l11;
  const v0 = l12.clone().sub(l11);
  const u1 = l21;
  const v1 = l22.clone().sub(l21);
  const x00 = u0.x;
  const y00 = u0.y;
  const x10 = u1.x;
  const y10 = u1.y;
  const x01 = v0.x;
  const y01 = v0.y;
  const x11 = v1.x;
  const y11 = v1.y;

  const d = x11 * y01 - x01 * y11;
  if (fuzzyEquals(0, d, DOUBLE_EQ_EPSILON)) {
    return false;
  }
  const s = (1 / d) * ((x00 - x10) * y01 - (y00 - y10) * x01);
  const t = (1 / d) * -(-(x00 - x10) * y11 + (y00 - y10) * x11);

  // use < instead of <= to not recognize "touching" as intersection
  return (
    // 0 < s
    fuzzyCompare(0, s, DOUBLE_EQ_EPSILON) < 0 &&
    // s < 1
    fuzzyCompare(s, 1, DOUBLE_EQ_EPSILON) < 0 &&
    // 0 < t
    fuzzyCompare(0, t, DOUBLE_EQ_EPSILON) < 0 &&
    // t < 1
    fuzzyCompare(t, 1, DOUBLE_EQ_EPSILON) < 0
  );
}

/**
 * Returns the intersection point of two line segments, defined as `p+t*r` and `q+u*s` with `0 <= t,u <= 1`.
 * If the line segments are collinear and overlapping there is not a single intersection point, so of the
 * possible points the closest to the center of the second segment is returned. Approach by Ronald Goldman
 * "Intersection of two lines in three-space".
 *
 * @returns the point of intersection or null if none exists
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/math/ElkMath.java
 */
export function intersects2(p: KVector, r: KVector, q: KVector, s: KVector): KVector | null {
  const pq = q.clone().sub(p);
  const pqXr = KVector.crossProduct(pq, r);
  const rXs = KVector.crossProduct(r, s);
  const t = KVector.crossProduct(pq, s) / rXs;
  const u = pqXr / rXs;
  if (rXs === 0) {
    if (pqXr === 0) {
      // segments are collinear: return point closest to center of s
      const center = q.clone().add(s.clone().scale(0.5));
      const d1 = p.distance(center);
      const d2 = p.clone().add(r).distance(center);
      const l = s.length() * 0.5;
      if (d1 < d2 && d1 <= l) {
        return p.clone();
      }
      if (d2 <= l) {
        return p.clone().add(r);
      }
      return null;
    }
    // segments are parallel
    return null;
  }
  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    // segments intersect
    return p.clone().add(r.clone().scale(t));
  }
  // segments don't intersect
  return null;
}

/**
 * Returns the distance between the line segments given by `(a1,a2)` and `(b1,b2)`. The distance is measured
 * in the direction specified by vector `v` starting at segment `b`. If the segments are oriented or spaced
 * such that `v` cannot reach one segment from the other, `Infinity` is returned.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/math/ElkMath.java
 */
export function distance(a1: KVector, a2: KVector, b1: KVector, b2: KVector, v: KVector): number {
  return Math.min(traceRays(a1, a2, b1, b2, v), traceRays(b1, b2, a1, a2, v.clone().negate()));
}

/**
 * Traces rays from the endpoints of line segment `b=(b1, b2)` in the direction `v` and with the length of
 * `v`. The rays' intersections with `a` yield the distance between `a` and `b`.
 */
function traceRays(a1: KVector, a2: KVector, b1: KVector, b2: KVector, v: KVector): number {
  let result = Number.POSITIVE_INFINITY;
  let intersection: KVector | null;
  let endpointHit = false;

  // check whether (b + v) intersects a to catch an edge case, where one ray exactly hits an endpoint
  // of a but the other ray is too short to reach a.
  intersection = intersects2(a1, a2.clone().sub(a1), b1.clone().add(v), b2.clone().sub(b1));
  const edgeCase = intersection !== null && !(intersection.equalsFuzzily(a1) || intersection.equalsFuzzily(a2));

  // trace ray from point b1 to segment a in direction v
  intersection = intersects2(a1, a2.clone().sub(a1), b1, v);
  if (intersection !== null) {
    if (intersection.equalsFuzzily(a1) === intersection.equalsFuzzily(a2) || edgeCase) {
      // update the distance result
      result = Math.min(result, intersection.sub(b1).length());
    } else {
      // ignore intersection if the ray exactly hits an endpoint of b
      // but track it to allow it only for one ray per segment
      endpointHit = true;
    }
  }

  // trace ray from point b2 to segment a in direction v
  intersection = intersects2(a1, a2.clone().sub(a1), b2, v);
  if (intersection !== null) {
    if (endpointHit || intersection.equalsFuzzily(a1) === intersection.equalsFuzzily(a2) || edgeCase) {
      // update the distance result
      result = Math.min(result, intersection.sub(b2).length());
    }
  }

  return result;
}

/**
 * Checks whether every straight line segment of the closed path `p_1,...,p_n` is fully contained within
 * `rect` (also the closing segment), whether `rect` fully contains the straight line `(p1, p2)` (a point on
 * the border counts as not contained), or whether `rect` contains the point `p` (a point on the border is
 * not contained). The Java overloads are told apart by arity and the type of the second argument.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/math/ElkMath.java
 */
export function contains(rect: ElkRectangle, path: KVectorChain): boolean;
export function contains(rect: ElkRectangle, p1: KVector, p2: KVector): boolean;
export function contains(rect: ElkRectangle, p: KVector): boolean;
export function contains(rect: ElkRectangle, second: KVectorChain | KVector, third?: KVector): boolean {
  if (third !== undefined) {
    return containsLine(rect, second as KVector, third);
  }
  if (second instanceof KVectorChain) {
    return containsPath(rect, second);
  }
  return containsPoint(rect, second);
}

function containsPath(rect: ElkRectangle, path: KVectorChain): boolean {
  if (path.size() < 2) {
    return false;
  }

  const pathIt = path.listIterator();
  const first = pathIt.next();
  let p1 = first;
  // check every segment
  while (pathIt.hasNext()) {
    const p2 = pathIt.next();
    if (!containsLine(rect, p1, p2)) {
      return false;
    }
    p1 = p2;
  }
  // check the closing segment
  if (!containsLine(rect, p1, first)) {
    return false;
  }

  return true;
}

function containsLine(rect: ElkRectangle, p1: KVector, p2: KVector): boolean {
  return containsPoint(rect, p1) && containsPoint(rect, p2);
}

function containsPoint(rect: ElkRectangle, p: KVector): boolean {
  const minX = rect.x;
  const maxX = rect.x + rect.width;
  const minY = rect.y;
  const maxY = rect.y + rect.height;

  return p.x > minX && p.x < maxX && p.y > minY && p.y < maxY;
}

/**
 * Calculates shortest distance between two axis aligned rectangles. If they intersect the returned distance
 * becomes negative. In the first case (overlap on one axis only) the result is the axis aligned distance
 * between the closest sides, in the other cases it is the euclidean distance between the closest corners.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/math/ElkMath.java
 */
export function shortestDistance(r1: ElkRectangle, r2: ElkRectangle): number {
  const rightDist = r2.x - (r1.x + r1.width);
  const leftDist = r1.x - (r2.x + r2.width);
  const topDist = r1.y - (r2.y + r2.height);
  const bottomDist = r2.y - (r1.y + r1.height);
  const horzDist = Math.max(leftDist, rightDist);
  const vertDist = Math.max(topDist, bottomDist);
  if (fuzzyCompare(horzDist, 0, DOUBLE_EQ_EPSILON) >= 0 !== fuzzyCompare(vertDist, 0, DOUBLE_EQ_EPSILON) >= 0) {
    // case 1
    return Math.max(vertDist, horzDist);
  }
  if (fuzzyCompare(horzDist, 0, DOUBLE_EQ_EPSILON) > 0) {
    // case 2
    return Math.sqrt(vertDist * vertDist + horzDist * horzDist);
  }
  // case 3
  return -Math.sqrt(vertDist * vertDist + horzDist * horzDist);
}
