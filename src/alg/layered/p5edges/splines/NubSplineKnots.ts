// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../../java/lang/IllegalArgumentException.js';
import * as Int32 from '../../../../java/lang/Int32.js';
import type { KVector } from '../../../../core/math/KVector.js';
import { KVectorChain } from '../../../../core/math/KVectorChain.js';
import { ArrayListIterator, type ListIterator } from '../../../../java/util/ListIterator.js';
import { EPSILON, NubSplinePolarCP } from './NubSplinePolarCP.js';

/**
 * The fields of Java's `NubSpline` that the section files read and write (`NubSplineKnots`, `NubSplineDerivation`,
 * `NubSplineBezier`). The facade `NubSpline` owns one instance; the sections are functions over it with the Java method
 * names, the same split `NetworkSimplexPlacer*` uses.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/splines/NubSpline.java:50
 */
export interface NubSplineState {
  /**
   * The knotVector of this NubSpline. (The traditionally added 0 at the beginning and 1 at the end of the knot vector
   * is not added, as these elements are not relevant for the calculation)
   */
  knotVector: number[];
  /** The control points of this NubSpline. */
  controlPoints: NubSplinePolarCP[];
  /** The dimension of this NubSpline. All contained and constructible vectors have the same dim. */
  dimNUBS: number;
  /**
   * Specifies of this NubSpline is uniform. To be exact this only depends on the knotVecor. A NubSpline is uniform if
   * the difference of two adjacent knots in the knot vector is either 0 or equal to a constant valid for the whole
   * spline.
   */
  isUniform: boolean;
  /**
   * Specifies of this NubSpline is clamped. To be exact this only depends on the knotVecor. A NubSpline is clamped, if
   * the first and last vector of it's knot vector has the multiplicity equal to it's dimension. (Remember the
   * neglected first and last vector. Otherwise this would be dimension +1.)
   */
  isClamped: boolean;
  /** Indicates if all inner knots of the knotVector have the multiplicity of dimNUBS. */
  isBezier: boolean;
  /** The value of parameter t (time), where the resulting spline would start. */
  minKnot: number;
  /** The value of parameter t (time), where the resulting spline would end. */
  maxKnot: number;
}

/**
 * The values of Java's private six-argument `NubSpline` constructor: a spline whose knot vector and polar control
 * points were computed by the caller (no error checking). A TypeScript constructor cannot be private per overload, so
 * the `NubSpline` constructor takes this object and the section files return it from the generators.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/splines/NubSpline.java:168
 */
export interface NubSplineParts {
  readonly clamped: boolean;
  readonly uniform: boolean;
  readonly bezier: boolean;
  readonly dim: number;
  readonly knotVec: number[];
  readonly polarVectors: NubSplinePolarCP[];
}

/**
 * Returns the control points (the very vectors, not copies) as a chain; the body of `NubSpline.getControlPoints`,
 * shared with `generateInvertedNUBS`.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/splines/NubSpline.java:316
 */
export function getControlPoints(s: NubSplineState): KVectorChain {
  const retVal = new KVectorChain();

  for (const polarCP of s.controlPoints) {
    retVal.add(polarCP.getCp());
  }
  return retVal;
}

/**
 * The sliding window that determines the polar coordinates of the PolarCPs. The Java repeats these two loops verbatim in
 * the constructor (`NubSpline.java:128-141`), in `generateDerivedNUBS` (`:213-226`) and in `generateInvertedNUBS`
 * (`:252-265`); one function stays under the function-size limit. Only `windowSize` differs per site: `dimNUBS - 1`.
 *
 * @param windowSize The number of leading knots of the window, (dimNUBS - 1) of the spline being built.
 * @param knotVector The knot vector the window slides over.
 * @param vectors The control points, one PolarCP each.
 */
export function createPolarCPs(
  windowSize: number,
  knotVector: readonly number[],
  vectors: Iterable<KVector>,
): NubSplinePolarCP[] {
  const polarCoordinate: number[] = [];
  const knotIter = new ArrayListIterator(knotVector as number[]);
  const polarVectors: NubSplinePolarCP[] = [];

  // the first (dimNUBS - 1) elements of the knotVector for the "sliding window" that
  // determines the polarCoordinates of the PolarCP.
  for (let i = 0; i < windowSize; i++) {
    polarCoordinate.push(knotIter.next());
  }

  // A sliding window over the knot vector determines the polar coordinates of the PolarCPs.
  for (const kVector of vectors) {
    polarCoordinate.push(knotIter.next());
    polarVectors.push(new NubSplinePolarCP(kVector, polarCoordinate));
    polarCoordinate.shift();
  }
  return polarVectors;
}

/**
 * Searches the given knot in the knot-vector.
 *
 * @return The index of the first occurrence of the knot in the knot-vector or the size of the knot-vector, if the knot
 *         is not found.
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/splines/NubSpline.java:361
 */
export function getIndexInKnotVector(s: NubSplineState, knot: number): number {
  const iter = new ArrayListIterator(s.knotVector);
  let currentKnot = knot - 1;

  while (iter.hasNext()) {
    currentKnot = iter.next();
    const diff = Math.abs(currentKnot - knot);
    if (diff < EPSILON) {
      return Int32.sub(iter.nextIndex(), 1);
    }
  }

  return s.knotVector.length;
}

/**
 * Calculates the multiplicity of a given knot.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/splines/NubSpline.java:382
 */
export function getMultiplicity(s: NubSplineState, knotToCheck: number): number {
  const iter = new ArrayListIterator(s.knotVector);
  let currentKnot: number;
  let count = 0;

  while (iter.hasNext()) {
    currentKnot = iter.next();
    const diff = currentKnot - knotToCheck;
    if (diff > EPSILON) {
      return count;
    } else if (diff > -EPSILON) {
      count++;
    }
  }

  return count;
}

/**
 * Creates a uniform knot-vector from 0.0 to 1.0. Like the Java it reads `isClamped` (not the parameter) for the
 * trailing ones; the constructor sets `isClamped = clamped` first, so the two agree.
 *
 * @param clamped Specifies if the knot-vector shall be clamped.
 * @param size The number of knots to generate.
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/splines/NubSpline.java:409
 */
export function createUniformKnotVector(s: NubSplineState, clamped: boolean, size: number): void {
  if (size < Int32.mul(2, s.dimNUBS)) {
    throw new IllegalArgumentException('The knot vector must have at least two time the dimension elements.');
  }
  let mySize: number;

  if (clamped) {
    s.minKnot = 0.0;
    s.maxKnot = 1.0;
    for (let i = 0; i < s.dimNUBS; i++) {
      s.knotVector.push(0.0);
    }
    mySize = Int32.sub(Int32.add(size, 1), Int32.mul(2, s.dimNUBS));
  } else {
    mySize = Int32.add(size, 1);
    const ddim = s.dimNUBS;
    s.minKnot = ddim / (mySize + 1);
    s.maxKnot = (mySize - ddim) / mySize;
  }

  const fraction = mySize;
  for (let i = 1; i < mySize; i++) {
    s.knotVector.push(i / fraction);
  }

  if (s.isClamped) {
    for (let i = 0; i < s.dimNUBS; i++) {
      s.knotVector.push(1.0);
    }
  }
}

/**
 * Converts a polar vector to a single t.
 *
 * @param polar The polar coordinate to convert.
 * @return A t value, representing the polar coordinate.
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/splines/NubSpline.java:455
 */
export function getTFromPolar(polar: readonly number[]): number {
  let sum = 0.0;
  for (const val of polar) {
    sum += val;
  }

  return sum / polar.length;
}

/**
 * Inserts a new knots to the knot-vector. Also calculates the new list of CPs. There is a limitation on the value of
 * the inserted knot: minKnot < knotToInsert < maxKnot, and the multiplicity of the knot to insert may not exceed the
 * dimension of the Nubs. Not recursive (R8): it calls {@link insertKnotAtCurrentPosition} once, which never calls back.
 *
 * @param knotToInsert The knot to insert.
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/splines/NubSpline.java:474
 */
export function insertKnot(s: NubSplineState, knotToInsert: number, insertions: number): void {
  const iterKnot = new ArrayListIterator(s.knotVector);

  // Skip elements not referring to a point on the drawn spline.
  if (s.isClamped) {
    for (let i = 0; i < s.dimNUBS; i++) {
      iterKnot.next();
    }
  } else {
    for (let i = 0; i < Int32.sub(s.dimNUBS, 1); i++) {
      iterKnot.next();
    }
  }

  const iterCP = new ArrayListIterator(s.controlPoints);
  let currentKnot = iterKnot.next();

  // we always insert the new knot AFTER all identical knots.
  while (currentKnot - knotToInsert < EPSILON) {
    currentKnot = iterKnot.next();
    iterCP.next();
  }
  // One step back on the knot-vector
  iterKnot.previous();

  // Insert the new knot.
  insertKnotAtCurrentPosition(s, insertions, knotToInsert, iterCP, iterKnot);
}

/**
 * The first loop of one insertion in `insertKnotAtCurrentPosition`: constructs the new CPs from the neighbouring pairs
 * of the CPs the iterator passes (`from` up to `dimNUBS`). Extracted only to stay under the function-size limit.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/splines/NubSpline.java:527
 */
function calculateNewCPs(
  iterCP: ListIterator<NubSplinePolarCP>,
  from: number,
  dimNUBS: number,
  knotToInsert: number,
): NubSplinePolarCP[] {
  const newCPs: NubSplinePolarCP[] = [];
  // The first CP we need for the calculation.
  let secondCP = iterCP.next();

  for (let j = from; j < dimNUBS; j++) {
    // The second CP we need for the calculation.
    const firstCP = secondCP;
    secondCP = iterCP.next();

    // Calculate the new CP.
    newCPs.push(new NubSplinePolarCP(firstCP, secondCP, knotToInsert));
  }
  return newCPs;
}

/**
 * Inserts a new knot to the knot-vector and calculates the new list of CPs. The correct position in knot-vector and
 * list of controlPoints must be pre-calculated!
 *
 * @param insertions How many times to insert the knot?
 * @param knotToInsert The knot to insert.
 * @param iterCP A iterator over the CPs. Iterator must point to the position before the first CP, that will be used
 *            for the calculation.
 * @param iterKnot A iterator over the knot-vector. Iterator must point to position where to insert the new knot.
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/splines/NubSpline.java:516
 */
export function insertKnotAtCurrentPosition(
  s: NubSplineState,
  insertions: number,
  knotToInsert: number,
  iterCP: ListIterator<NubSplinePolarCP>,
  iterKnot: ListIterator<number>,
): void {
  const multiplicity = getMultiplicity(s, knotToInsert);
  for (let i = 0; i < insertions; i++) {
    // Insert the new knot to the knotVector.
    iterKnot.add(knotToInsert);

    // We will first construct the new CPs and than add them.
    const newCPs = calculateNewCPs(iterCP, Int32.add(multiplicity, i), s.dimNUBS, knotToInsert);

    // move to the insertion position, and on the way delete all CPs we have used for two
    // calculations as they don't belong to the new list of CPs.
    for (let j = Int32.add(multiplicity, i); j < s.dimNUBS; j++) {
      iterCP.previous();
      if (j > Int32.add(multiplicity, i)) {
        iterCP.remove();
      }
    }

    // now we can add the new CPs
    for (const cp of newCPs) {
      iterCP.add(cp);
    }

    // Move back to the position in front of the first new CP, if there will be more
    // insertions
    if (i < Int32.sub(insertions, 1)) {
      for (let j = Int32.add(multiplicity, i); j < s.dimNUBS; j++) {
        iterCP.previous();
      }
    }
  }
}
