// SPDX-License-Identifier: EPL-2.0
import { KVectorChain } from '../../../../core/math/KVectorChain.js';
import * as Int32 from '../../../../java/lang/Int32.js';
import { ArrayListIterator, type ListIterator } from '../../../../java/util/ListIterator.js';
import { insertKnotAtCurrentPosition, type NubSplineState } from './NubSplineKnots.js';
import { EPSILON } from './NubSplinePolarCP.js';

/**
 * The leading-knot handling at the start of `toBezier`, extracted only to stay under the function-size limit.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/splines/NubSpline.java:851
 */
function skipLeadingKnots(s: NubSplineState, iterKnot: ListIterator<number>): void {
  // Unclamped knotVectors have (dim-1) leading and trailing knots that are not repeated and
  // don't need to be repeated.
  // Clamped knotVectors have (dim) leading and trailing knots that are already repeated. We
  // skip them for performance.
  if (s.isClamped) {
    for (let i = 0; i < s.dimNUBS; i++) {
      iterKnot.next();
    }
  } else {
    for (let i = 0; i < Int32.sub(s.dimNUBS, 1); i++) {
      iterKnot.next();
      iterKnot.remove();
    }
  }
}

/**
 * Converts this NubSpline to a bezier spline. All inner knots of the knotVector get the multiplicity of dimNUBS.
 *
 * @param s The state of the NubSpline to convert, in place.
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/splines/NubSpline.java:848
 */
export function toBezier(s: NubSplineState): void {
  const iterKnot = new ArrayListIterator(s.knotVector);
  const iterCP = new ArrayListIterator(s.controlPoints);

  skipLeadingKnots(s, iterKnot);

  let currentKnot = iterKnot.next();
  // Iterate over all knots those multiplicity we possibly have to increase.
  while (s.maxKnot - currentKnot > EPSILON) {
    const knotToCount = currentKnot;
    let occurrence = 0;

    // Count occurrences of knotToCount.
    while (Math.abs(currentKnot - knotToCount) < EPSILON) {
      occurrence++;
      currentKnot = iterKnot.next();
      iterCP.next();
    }

    // insert new knots, if multiplicity is not as expected (dimNUBS)
    if (occurrence < s.dimNUBS) {
      iterKnot.previous();
      insertKnotAtCurrentPosition(s, Int32.sub(s.dimNUBS, occurrence), knotToCount, iterCP, iterKnot);
      iterKnot.next();
    }

    // Proceed to next elements.
    iterCP.previous();
  }

  if (!s.isClamped) {
    for (let i = 0; i < Int32.sub(s.dimNUBS, 1); i++) {
      iterKnot.next();
      iterKnot.remove();
    }
  }
  s.isClamped = true;
  s.isBezier = true;
}

/**
 * Returns all bezier control points needed to create an equivalent bezier spline. If the NubSpline still not holds the
 * requirements for a bezier spline, it is converted to to so. Java's `getBezierCP()` is the call with both flags false.
 *
 * @param s The state of the NubSpline.
 * @param withSourceVector Specify if the source vector shall be included in the vector chain.
 * @param withTargetVector Specify if the target vector shall be included in the vector chain.
 * @return The bezier control-points.
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/splines/NubSpline.java:911
 */
export function getBezierCP(s: NubSplineState, withSourceVector: boolean, withTargetVector: boolean): KVectorChain {
  if (!s.isBezier) {
    toBezier(s);
  }
  const retVal = new KVectorChain();
  const iter = new ArrayListIterator(s.controlPoints);

  if (!withSourceVector) {
    iter.next();
  }

  while (iter.hasNext()) {
    retVal.add(iter.next().getCp());
  }

  if (!withTargetVector) {
    retVal.removeLast();
  }

  return retVal;
}
