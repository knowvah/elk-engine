// SPDX-License-Identifier: EPL-2.0
import { KVector } from '../../../core/math/KVector.js';
import { KVectorChain } from '../../../core/math/KVectorChain.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { DCDirection } from '../graph/DCDirection.js';

// Section of `ElkGraphTransformer` (the geometry helpers: `getContour`, `getOrthogonalPoints`, `computeIntersection`,
// `newPoint`, `nearestSide`, `adjustFirstSegment`), split out for the 500-line file limit and the function-size limits.
// The class keeps every Java method name and delegates here; the statements of each method and their order are the
// Java's. The Java makes no `java.awt.geom` call in this bundle, so none is ported. `getContour` is cut at the comment
// "Compute the intersections of the line segments of the orthogonal points" (`collectOrthogonalPoints` above it,
// `mergeIntersections` for the two identical merge blocks `ccwMerged` and `cwMerged` below it).

/** The nifty constant of the Java class (`HALF_PI`). */
export const HALF_PI = Math.PI / 2;

/**
 * Creates a new instance of {@link KVector}.
 *
 * @param x X-coordinate
 * @param y Y-coordinate
 * @returns Freshly instantiated point
 * @see org.eclipse.elk.alg.disco/src/org/eclipse/elk/alg/disco/transform/ElkGraphTransformer.java
 */
export function newPoint(x: number, y: number): KVector {
  return new KVector(x, y);
}

/**
 * Creates two points from one point (of an edge) orthogonal to the edges orientation with a distance of `radius` on
 * each side of the edge. `Math.atan2`, `Math.sin` and `Math.cos` are the native V8 functions (translation rules 1.9).
 *
 * @param curX X-coordinate of current source, bend or target point on the edge
 * @param curY Y-coordinate of current source, bend or target point on the edge
 * @param nxtX X-coordinate of next source, bend or target point on the edge
 * @param nxtY Y-coordinate of next source, bend or target point on the edge
 * @param radius Distance of the generated point from the current point
 * @returns Generated points as a list
 * @see org.eclipse.elk.alg.disco/src/org/eclipse/elk/alg/disco/transform/ElkGraphTransformer.java
 */
export function getOrthogonalPoints(
  curX: number,
  curY: number,
  nxtX: number,
  nxtY: number,
  radius: number,
): [KVector, KVector] {
  const difX = nxtX - curX;
  const difY = nxtY - curY;

  const angleRadians = Math.atan2(difX, difY);
  const orthAngleCCW = angleRadians + HALF_PI;
  const orthAngleCW = angleRadians - HALF_PI;

  const xCCW = radius * Math.sin(orthAngleCCW) + curX;
  const yCCW = radius * Math.cos(orthAngleCCW) + curY;
  const xCW = radius * Math.sin(orthAngleCW) + curX;
  const yCW = radius * Math.cos(orthAngleCW) + curY;

  return [newPoint(xCCW, yCCW), newPoint(xCW, yCW)];
}

/**
 * The intersection of the lines through (p1, p2) and (p3, p4); might result in +inf or -inf.
 *
 * @see org.eclipse.elk.alg.disco/src/org/eclipse/elk/alg/disco/transform/ElkGraphTransformer.java
 */
export function computeIntersection(p1: KVector, p2: KVector, p3: KVector, p4: KVector): KVector {
  const x1 = p1.x;
  const y1 = p1.y;
  const x2 = p2.x;
  const y2 = p2.y;
  const x3 = p3.x;
  const y3 = p3.y;
  const x4 = p4.x;
  const y4 = p4.y;

  const factor1 = x1 * y2 - y1 * x2;
  const factor2 = x3 * y4 - y3 * x4;
  const denominator = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);

  const x = (factor1 * (x3 - x4) - factor2 * (x1 - x2)) / denominator;
  const y = (factor1 * (y3 - y4) - factor2 * (y1 - y2)) / denominator;

  return newPoint(x, y);
}

/** The orthogonal points on both sides of an edge. */
interface OrthogonalPoints {
  readonly ccwPoints: KVector[];
  readonly cwPoints: KVector[];
}

/**
 * The first part of `getContour`, up to the comment "Compute the intersections of the line segments of the orthogonal
 * points".
 *
 * @param edgePoints All relevant points of an Edge (at least two)
 * @param radius half of the thickness
 * @returns the counter-clockwise and the clockwise points
 */
function collectOrthogonalPoints(edgePoints: readonly KVector[], radius: number): OrthogonalPoints {
  const ccwPoints: KVector[] = [];
  const cwPoints: KVector[] = [];

  const numberOfPoints = edgePoints.length;

  // special case: first edge segment. Assumption an edge has at least two points
  let predecessor: KVector;
  let current = edgePoints[0]!;
  let successor = edgePoints[1]!;
  let orthPoints = getOrthogonalPoints(current.x, current.y, successor.x, successor.y, radius);
  ccwPoints.push(orthPoints[0]);
  cwPoints.push(orthPoints[1]);

  // normal case: bendpoints have a preceding and a succeeding neighbor
  for (let i = 2; i < numberOfPoints; i++) {
    predecessor = current;
    current = successor;
    successor = edgePoints[i]!;
    orthPoints = getOrthogonalPoints(current.x, current.y, predecessor.x, predecessor.y, radius);
    ccwPoints.push(orthPoints[1]);
    cwPoints.push(orthPoints[0]);

    orthPoints = getOrthogonalPoints(current.x, current.y, successor.x, successor.y, radius);
    ccwPoints.push(orthPoints[0]);
    cwPoints.push(orthPoints[1]);
  }
  // For the last point, consider the line connecting back to the previous point (the resulting orthogonal points
  // will be in reversed order in the resulting list, though.).
  orthPoints = getOrthogonalPoints(successor.x, successor.y, current.x, current.y, radius);
  ccwPoints.push(orthPoints[1]);
  cwPoints.push(orthPoints[0]);

  return { ccwPoints, cwPoints };
}

/**
 * One of the two identical blocks of `getContour` that compute the intersections of the line segments of the
 * orthogonal points (`ccwMerged`, `cwMerged`).
 *
 * @param points the orthogonal points of one side
 * @returns the merged points of that side
 */
function mergeIntersections(points: readonly KVector[]): KVector[] {
  const merged: KVector[] = [];
  merged.push(points[0]!);
  for (let i = 1; i < points.length - 2; i += 2) {
    const currentPoint = points[i]!;
    const intersectionPoint = computeIntersection(points[i - 1]!, currentPoint, points[i + 1]!, points[i + 2]!);

    // Keep currentPoint if lines are coincident (or parallel).
    if (!Number.isFinite(intersectionPoint.x) || !Number.isFinite(intersectionPoint.y)) {
      merged.push(currentPoint);
    } else {
      merged.push(intersectionPoint);
    }
  }
  merged.push(points[points.length - 1]!);
  return merged;
}

/**
 * Given all source, bend and target points of an edge in correct order, this method computes all vertices needed to
 * construct a polygonal `DCElement` for it.
 *
 * @param edgePoints All relevant points of an Edge as described above
 * @param thickness Desired thickness of the edge
 * @returns List of vertices of the edge as a polygon considering the given thickness
 * @see org.eclipse.elk.alg.disco/src/org/eclipse/elk/alg/disco/transform/ElkGraphTransformer.java
 */
export function getContour(edgePoints: readonly KVector[], thickness: number): KVectorChain {
  const radius = thickness / 2;
  const { ccwPoints, cwPoints } = collectOrthogonalPoints(edgePoints, radius);

  // Compute the intersections of the line segments of the orthogonal points
  const ccwMerged = new KVectorChain(mergeIntersections(ccwPoints));
  const cwMerged = mergeIntersections(cwPoints);

  // merge lists (one of them has to be added in reverse order)
  for (let i = cwMerged.length - 1; i >= 0; i--) {
    ccwMerged.add(cwMerged[i]!);
  }

  return ccwMerged;
}

/**
 * Computes for a given {@link KVector} relative to the upper left corner of a given node, which of its four sides is
 * closest to the point the vector describes.
 *
 * @param point vector to compare
 * @param node node as reference to the vector
 * @returns side of the node which is closest to the point
 * @see org.eclipse.elk.alg.disco/src/org/eclipse/elk/alg/disco/transform/ElkGraphTransformer.java
 */
export function nearestSide(point: KVector, node: ElkNode): DCDirection {
  let distance: number;
  let shortestDistance = Number.MAX_VALUE;
  let result = DCDirection.NORTH;

  // NORTHVALUE
  shortestDistance = Math.abs(point.y);
  // SOUTHVALUE
  distance = Math.abs(node.getHeight() - point.y);
  if (distance < shortestDistance) {
    shortestDistance = distance;
    result = DCDirection.SOUTH;
  }
  // WESTVALUE
  distance = Math.abs(point.x);
  if (distance < shortestDistance) {
    shortestDistance = distance;
    result = DCDirection.WEST;
  }
  // EASTVALUE
  distance = Math.abs(node.getWidth() - point.x);
  if (distance < shortestDistance) {
    shortestDistance = distance;
    result = DCDirection.EAST;
  }
  return result;
}

/**
 * Applies all changes to an edge segment which has been treated as an extension during compaction after the
 * compaction process has finished.
 *
 * @param source node the edge belongs to
 * @param chain edge in its vector chain form
 * @param dir direction the extension points to
 * @returns adjusted vector chain
 * @see org.eclipse.elk.alg.disco/src/org/eclipse/elk/alg/disco/transform/ElkGraphTransformer.java
 */
export function adjustFirstSegment(source: ElkNode, chain: KVectorChain, dir: DCDirection): KVectorChain {
  const firstPoint = chain.removeFirst();
  switch (dir) {
    case DCDirection.NORTH:
      firstPoint.y = 0;
      break;
    case DCDirection.SOUTH:
      firstPoint.y = source.getHeight();
      break;
    case DCDirection.WEST:
      firstPoint.x = 0;
      break;
    default: // EAST
      firstPoint.x = source.getWidth();
  }

  chain.addAt(0, firstPoint);

  return chain;
}
