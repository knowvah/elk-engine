// SPDX-License-Identifier: EPL-2.0
import type { LinkedList } from '../../java/util/LinkedList.js';
import type { BezierSpline } from './BezierSpline.js';
import type { KVector } from './KVector.js';

/**
 * Global interface for any Spline interpolator. The four Java `interpolatePoints` overloads (array vs
 * `LinkedList`, with and without tangents) are one overloaded method.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/math/ISplineInterpolator.java
 */
export interface ISplineInterpolator {
  /**
   * Returns a piecewise bezierspline.
   *
   * @param points as an array or list, see implementing class which to prefer
   * @param startVec tangent vector specifying to head out of the first node
   * @param endVec tangent vector specifying to head into the last node
   * @param tangentScale if true, the tangent is scaled depending on the distance to the next ctr point
   */
  interpolatePoints(points: KVector[] | LinkedList<KVector>): BezierSpline;
  interpolatePoints(
    points: KVector[] | LinkedList<KVector>,
    startVec: KVector,
    endVec: KVector,
    tangentScale: boolean,
  ): BezierSpline;
}
