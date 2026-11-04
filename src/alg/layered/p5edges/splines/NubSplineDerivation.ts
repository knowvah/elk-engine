// SPDX-License-Identifier: EPL-2.0
import type { KVector } from '../../../../core/math/KVector.js';
import { KVectorChain } from '../../../../core/math/KVectorChain.js';
import * as Int32 from '../../../../java/lang/Int32.js';
import { ArrayListIterator } from '../../../../java/util/ListIterator.js';
import type { NubSpline } from './NubSpline.js';
import {
  createPolarCPs,
  getControlPoints,
  getTFromPolar,
  type NubSplineParts,
  type NubSplineState,
} from './NubSplineKnots.js';
import { EPSILON, NubSplinePolarCP } from './NubSplinePolarCP.js';

// Generators ------------------------------------------------------------------------------------------------------

/**
 * Computes the values of the NubSpline that is the derivation of the given one. `NubSpline.generateDerivedNUBS` wraps
 * them in the instance (a section never imports its facade, so it cannot call the private constructor). Not recursive
 * (R8).
 *
 * @param nubSpline The state of the NubSpline to create the derivation from.
 * @return The values of the derivation.
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/splines/NubSpline.java:189
 */
export function generateDerivedNUBS(nubSpline: NubSplineState): NubSplineParts {
  const newClamped = nubSpline.isClamped;
  const newUniform = nubSpline.isUniform;
  const newBezier = nubSpline.isBezier;
  const oldDim = nubSpline.dimNUBS;
  const newDim = Int32.sub(oldDim, 1);
  const oldKnotVector = nubSpline.knotVector;
  const newKnotVector = nubSpline.knotVector.slice(1, nubSpline.knotVector.length - 1);
  const newControlPoints: KVector[] = [];

  // Calculate the new control points.
  for (let i = 0; i < nubSpline.controlPoints.length - 1; i++) {
    const newCP = nubSpline.controlPoints[i + 1]
      .getCp()
      .clone()
      .sub(nubSpline.controlPoints[i].getCp())
      .scale(oldDim / (oldKnotVector[Int32.add(i, oldDim)] - oldKnotVector[i]));
    newControlPoints.push(newCP);
  }

  // Create the PolarCPs
  const newPolarVectors = createPolarCPs(Int32.sub(newDim, 1), newKnotVector, newControlPoints);

  // Create the new NubSpline.
  return {
    clamped: newClamped,
    uniform: newUniform,
    bezier: newBezier,
    dim: newDim,
    knotVec: newKnotVector,
    polarVectors: newPolarVectors,
  };
}

/**
 * Computes the values of a inverted copy of the given NubSpline. The control-points will be inverted. The distribution
 * of the vectors on the knot-vector will be inverted, but the knot-vector will be sorted ascending, again.
 * `NubSpline.generateInvertedNUBS` wraps them in the instance.
 *
 * @param nubSpline The state of the NubSpline to create a inverted copy from.
 * @return The values of the inverted NubSpline.
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/splines/NubSpline.java:240
 */
export function generateInvertedNUBS(nubSpline: NubSplineState): NubSplineParts {
  const newKnotVector: number[] = [];
  const maxVector = nubSpline.knotVector[nubSpline.knotVector.length - 1];
  for (const vector of nubSpline.knotVector) {
    newKnotVector.unshift(maxVector - vector);
  }
  const newControlPoints = KVectorChain.reverse(getControlPoints(nubSpline));

  // Create the PolarCPs
  const newPolarVectors = createPolarCPs(Int32.sub(nubSpline.dimNUBS, 1), newKnotVector, newControlPoints);

  // Create the new NubSpline.
  return {
    clamped: nubSpline.isClamped,
    uniform: nubSpline.isUniform,
    bezier: nubSpline.isBezier,
    dim: nubSpline.dimNUBS,
    knotVec: newKnotVector,
    polarVectors: newPolarVectors,
  };
}

// Calculating extrema ---------------------------------------------------------------------------------------------

/**
 * Returns the t-value of the first vertical point on a NubSpline. The Java computes `firstDerive =
 * generateDerivedNUBS(nubSpline)` first; `NubSpline.getFirstVerticalPoint` does that and passes it in, because only the
 * facade can build a NubSpline.
 *
 * @param nubSpline The spline to check.
 * @param firstDerive Its first derivation.
 * @param accuracy The desired accuracy.
 * @param maxRecursion The maximum number of recursions.
 * @return The t-value of the maximum of the spline.
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/splines/NubSpline.java:572
 */
export function getFirstVerticalPoint(
  nubSpline: NubSpline,
  firstDerive: NubSpline,
  accuracy: number,
  maxRecursion: number,
): KVector {
  let currentAccuracy = Number.POSITIVE_INFINITY;
  let currentVector: KVector | null = null;
  let loopCount = 0;
  let knot = 0.0;

  while (currentAccuracy > accuracy && loopCount < maxRecursion) {
    knot = getZeroXOfControlPoligon(firstDerive.state);
    currentVector = firstDerive.getPointOnCurve(knot, true);
    currentAccuracy = Math.abs(currentVector.x);
    loopCount++;
  }
  return nubSpline.getPointOnCurve(knot, false);
}

/**
 * Returns the t-value of the last vertical point on a NubSpline. The Java computes `firstDerive =
 * generateInvertedNUBS(generateDerivedNUBS(nubSpline))` first; the facade passes it in.
 *
 * @param nubSpline The spline to check.
 * @param firstDerive Its first derivation, inverted.
 * @param accuracy The desired accuracy.
 * @param maxRecursion The maximum number of recursions.
 * @return The t-value of the maximum of the spline.
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/splines/NubSpline.java:599
 */
export function getLastVerticalPoint(
  nubSpline: NubSpline,
  firstDerive: NubSpline,
  accuracy: number,
  maxRecursion: number,
): KVector {
  let currentAccuracy = Number.POSITIVE_INFINITY;
  let currentVector: KVector | null = null;
  let loopCount = 0;
  let knot = 0.0;

  while (currentAccuracy > accuracy && loopCount < maxRecursion) {
    knot = getZeroXOfControlPoligon(firstDerive.state);
    currentVector = firstDerive.getPointOnCurve(knot, true);
    currentAccuracy = Math.abs(currentVector.x);
    loopCount++;
  }
  const maxVal = nubSpline.getKnotVector()[nubSpline.getKnotVector().length - 1];
  return nubSpline.getPointOnCurve(maxVal - knot, false);
}

/**
 * Returns the t-value of the first horizontal point on a NubSpline. `firstDerive` as in
 * {@link getFirstVerticalPoint}.
 *
 * @param nubSpline The spline to check.
 * @param firstDerive Its first derivation.
 * @param accuracy The desired accuracy.
 * @param maxRecursion The maximum number of recursions.
 * @return The t-value of the maximum of the spline.
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/splines/NubSpline.java:626
 */
export function getFirstHorizontalPoint(
  nubSpline: NubSpline,
  firstDerive: NubSpline,
  accuracy: number,
  maxRecursion: number,
): KVector {
  let currentAccuracy = Number.POSITIVE_INFINITY;
  let currentVector: KVector | null = null;
  let loopCount = 0;
  let knot = 0.0;

  while (currentAccuracy > accuracy && loopCount < maxRecursion) {
    knot = getZeroYOfControlPoligon(firstDerive.state);
    currentVector = firstDerive.getPointOnCurve(knot, true);
    currentAccuracy = Math.abs(currentVector.y);
    loopCount++;
  }
  return nubSpline.getPointOnCurve(knot, false);
}

/**
 * Returns the t-value of the last horizontal point on a NubSpline. `firstDerive` as in {@link getLastVerticalPoint}.
 *
 * @param nubSpline The spline to check.
 * @param firstDerive Its first derivation, inverted.
 * @param accuracy The desired accuracy.
 * @param maxRecursion The maximum number of recursions.
 * @return The t-value of the maximum of the spline.
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/splines/NubSpline.java:652
 */
export function getLastHorizontalPoint(
  nubSpline: NubSpline,
  firstDerive: NubSpline,
  accuracy: number,
  maxRecursion: number,
): KVector {
  let currentAccuracy = Number.POSITIVE_INFINITY;
  let currentVector: KVector | null = null;
  let loopCount = 0;
  let knot = 0.0;

  while (currentAccuracy > accuracy && loopCount < maxRecursion) {
    knot = getZeroYOfControlPoligon(firstDerive.state);
    currentVector = firstDerive.getPointOnCurve(knot, true);
    currentAccuracy = Math.abs(currentVector.y);
    loopCount++;
  }
  const maxVal = nubSpline.getKnotVector()[nubSpline.getKnotVector().length - 1];
  return nubSpline.getPointOnCurve(maxVal - knot, false);
}

/**
 * The zero inside the line between two control points whose coordinate (`firstValue`, `secondValue`) changes sign: the
 * `factor` block both `getZero…OfControlPoligon` repeat for x and y. Extracted only to stay under the function-size
 * limit.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/splines/NubSpline.java:777
 */
function interpolateZero(
  firstCP: NubSplinePolarCP,
  firstValue: number,
  secondCP: NubSplinePolarCP,
  secondValue: number,
): number {
  let factor: number;
  factor = firstValue / (firstValue - secondValue);
  const t1 = getTFromPolar(firstCP.getPolarCoordinate());
  const t2 = getTFromPolar(secondCP.getPolarCoordinate());
  return factor * t1 + (1 - factor) * t2;
}

/**
 * Returns a progression value (t) of the first zero (Y-value) in the control polygon. If the polygon starts at zero,
 * this zero is ignored and the next zero is returned. If there is no zero found, 0.0 is returned.
 *
 * @param nubSpline The state of the NubSpline those zero of control polygon to calculate.
 * @return The progression value t. min[knotVector] < t <= max[knotVector]
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/splines/NubSpline.java:737
 */
function getZeroYOfControlPoligon(nubSpline: NubSplineState): number {
  const iter = new ArrayListIterator(nubSpline.controlPoints);
  // the CPs we are working with.
  let firstCP: NubSplinePolarCP, secondCP: NubSplinePolarCP;
  // Determines if one of the CPs is bigger than zero.
  let firstIsPositive: boolean, secondIsPositive: boolean;
  // Determines if one of the CPs is smaller than zero.
  let firstIsNegative: boolean, secondIsNegative: boolean;
  // the y values of the CPs we are working with.
  let firstY = 0.0;
  let secondY: number;

  // initialize
  secondCP = iter.next();
  secondY = secondCP.getCp().y;
  secondIsPositive = secondY > EPSILON;
  secondIsNegative = secondY < -EPSILON;

  while (iter.hasNext()) {
    // Proceed to next line between CPs:
    //update first CP.
    firstCP = secondCP;
    firstY = secondY;
    firstIsPositive = secondIsPositive;
    firstIsNegative = secondIsNegative;

    // update second CP.
    secondCP = iter.next();
    secondY = secondCP.getCp().y;
    secondIsPositive = secondY > EPSILON;
    secondIsNegative = secondY < -EPSILON;

    // Check if there is a zero at the second CP.
    if (!(secondIsPositive || secondIsNegative)) {
      return getTFromPolar(secondCP.getPolarCoordinate());
    }

    // check for zero in the line between the two CPs
    if ((firstIsPositive && secondIsNegative) || (firstIsNegative && secondIsPositive)) {
      return interpolateZero(firstCP, firstY, secondCP, secondY);
    }
  }
  return 0.0;
}

/**
 * Returns a progression value (t) of the first zero (X-value) in the control polygon. If the polygon starts at zero,
 * this zero is ignored and the next zero is returned. If there is no zero found, 0.0 is returned.
 *
 * @param nubSpline The state of the NubSpline those zero of control polygon to calculate.
 * @return The progression value t. min[knotVector] < t <= max[knotVector]
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/splines/NubSpline.java:793
 */
function getZeroXOfControlPoligon(nubSpline: NubSplineState): number {
  const iter = new ArrayListIterator(nubSpline.controlPoints);
  // the CPs we are working with.
  let firstCP: NubSplinePolarCP, secondCP: NubSplinePolarCP;
  // Determines if one of the CPs is bigger than zero.
  let firstIsPositive: boolean, secondIsPositive: boolean;
  // Determines if one of the CPs is smaller than zero.
  let firstIsNegative: boolean, secondIsNegative: boolean;
  // the x values of the CPs we are working with.
  let firstX = 0.0;
  let secondX: number;

  // initialize
  secondCP = iter.next();
  secondX = secondCP.getCp().x;
  secondIsPositive = secondX > EPSILON;
  secondIsNegative = secondX < -EPSILON;

  while (iter.hasNext()) {
    // Proceed to next line between CPs:
    // Update first CP.
    firstCP = secondCP;
    firstX = secondX;
    firstIsPositive = secondIsPositive;
    firstIsNegative = secondIsNegative;

    // Update second CP.
    secondCP = iter.next();
    secondX = secondCP.getCp().x;
    secondIsPositive = secondX > EPSILON;
    secondIsNegative = secondX < -EPSILON;

    // Check if there is a zero at the second CP.
    if (!(secondIsPositive || secondIsNegative)) {
      return getTFromPolar(secondCP.getPolarCoordinate());
    }

    // check for zero in the line between the two CPs
    if ((firstIsPositive && secondIsNegative) || (firstIsNegative && secondIsPositive)) {
      return interpolateZero(firstCP, firstX, secondCP, secondX);
    }
  }
  return 0.0;
}
