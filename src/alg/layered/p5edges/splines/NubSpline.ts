// SPDX-License-Identifier: EPL-2.0
import { KVector } from '../../../../core/math/KVector.js';
import { KVectorChain } from '../../../../core/math/KVectorChain.js';
import { IllegalArgumentException } from '../../../../java/lang/IllegalArgumentException.js';
import { IndexOutOfBoundsException } from '../../../../java/lang/IndexOutOfBoundsException.js';
import * as Int32 from '../../../../java/lang/Int32.js';
import { ArrayListIterator } from '../../../../java/util/ListIterator.js';
import { getBezierCP, toBezier } from './NubSplineBezier.js';
import {
  generateDerivedNUBS as deriveParts,
  generateInvertedNUBS as invertParts,
  getFirstHorizontalPoint,
  getFirstVerticalPoint,
  getLastHorizontalPoint,
  getLastVerticalPoint,
} from './NubSplineDerivation.js';
import {
  createPolarCPs,
  createUniformKnotVector,
  getControlPoints,
  getIndexInKnotVector,
  getMultiplicity,
  insertKnot,
  type NubSplineParts,
  type NubSplineState,
} from './NubSplineKnots.js';
import { NubSplinePolarCP, polarCPsToString } from './NubSplinePolarCP.js';
import { Rectangle } from './Rectangle.js';

/** A `List<KVector>` argument of the constructor: the Java list is mutated (padded at the front) in place. */
export type ControlPointList = KVector[] | KVectorChain;

/** Whether the constructor's trailing arguments are one list (`List<KVector>`) rather than the vectors (`KVector...`). */
function isList(rest: readonly (ControlPointList | KVector)[]): rest is [ControlPointList] {
  return rest.length === 1 && !(rest[0] instanceof KVector);
}

function sizeOf(list: ControlPointList): number {
  return Array.isArray(list) ? list.length : list.size();
}

/** `kVectors.add(0, kVectors.get(0))` */
function prependFirst(list: ControlPointList): void {
  if (Array.isArray(list)) {
    // `ArrayList.get(0)` throws on an empty list; an array would yield undefined
    if (list.length === 0) {
      throw new IndexOutOfBoundsException('Index 0 out of bounds for length 0');
    }
    list.unshift(list[0]);
  } else {
    list.addAt(0, list.get(0));
  }
}

/**
 * The state of `NubSpline(boolean clamped, int dimension, List<KVector> kVectors)`: pads the list to at least
 * `dimension + 1` control points, creates the uniform knot vector and one PolarCP per control point.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/splines/NubSpline.java:103
 */
function stateOfControlPoints(clamped: boolean, dimension: number, kVectors: ControlPointList): NubSplineState {
  if (dimension < 1) {
    throw new IllegalArgumentException('The dimension must be at least 1!');
  }

  // fill the list of control-points to be at least equal to dimension + 1
  for (let i = Int32.sub(sizeOf(kVectors), 1); i < dimension; i++) {
    prependFirst(kVectors);
  }

  // Cannot hold here: the loop above ends with size - 1 >= dimension. The Java keeps the check.
  if (sizeOf(kVectors) < Int32.add(dimension, 1)) {
    throw new IllegalArgumentException('At (least dimension + 1) control points are necessary!');
  }
  const state: NubSplineState = {
    knotVector: [],
    controlPoints: [],
    dimNUBS: dimension,
    isClamped: clamped,
    isUniform: true,
    isBezier: false,
    minKnot: 0,
    maxKnot: 0,
  };

  // create the knot vector
  createUniformKnotVector(state, clamped, Int32.sub(Int32.add(sizeOf(kVectors), state.dimNUBS), 1));

  // Create the PolarCPs
  state.controlPoints = createPolarCPs(Int32.sub(state.dimNUBS, 1), state.knotVector, kVectors);
  return state;
}

/**
 * The state of the private precalculated-values constructor: no error checking.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/splines/NubSpline.java:168
 */
function stateOfParts(parts: NubSplineParts): NubSplineState {
  return {
    isClamped: parts.clamped,
    isUniform: parts.uniform,
    isBezier: parts.bezier,
    dimNUBS: parts.dim,
    knotVector: parts.knotVec,
    controlPoints: parts.polarVectors,
    // `knotVec.iterator().next()` throws NoSuchElementException on an empty vector, before `Iterables.getLast` would
    minKnot: new ArrayListIterator(parts.knotVec).next(),
    maxKnot: parts.knotVec[parts.knotVec.length - 1],
  };
}

/**
 * Represents a Non Uniform B-Spline. This spline is not rational, thus there is no weight for the control points. The
 * control points of the represented spline are stored as PolarCPs. This class also holds their name in the polar form,
 * that is described by Sederberg. For details of this notation, please refer Senderberg: "An introduction to B-Spline
 * Curves" (2005).
 *
 * A control point those polar coordinates are all the same is laying on the spline.
 *
 * The knot vector does not store the irrelevant first and last vector traditionally added to it. These two vectors are
 * meaningless, thus don't need to be stored. Remember this if you want to directly work with the knot vector.
 *
 * Structure: the Java class is split into section files at its method boundaries. This facade keeps the construction,
 * the getters, `getPointOnCurve`, the generators' wrappers and `generateNiceCurve`; `NubSplineKnots` holds the knot
 * vector, multiplicity and insertion, `NubSplineDerivation` the derived and inverted splines and the vertical and
 * horizontal points, `NubSplineBezier` `toBezier`, and `NubSplinePolarCP` the nested `PolarCP`. The sections are
 * functions over {@link NubSplineState}, the Java private fields, which this facade owns as {@link NubSpline.state}.
 * Java's `protected` and package-private members are public here.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/splines/NubSpline.java:41
 */
export class NubSpline {
  /** Default dimension of the spline. */
  static readonly DIM: number = 3;

  /** The Java private fields, for the section files (not for callers). */
  readonly state: NubSplineState;
  /** The outer margins of this spline. */
  #outerBox: Rectangle | null = null;

  /** A copy constructor. */
  constructor(nubSpline: NubSpline);
  /**
   * Creates a new uniform NubSpline with the specified control points. The dimension must be > 0. The list is padded in
   * place (Java `List` overload).
   */
  constructor(clamped: boolean, dimension: number, kVectors: ControlPointList);
  /** Creates a new uniform NubSpline with the specified control points (Java `KVector...` overload). */
  constructor(clamped: boolean, dimension: number, ...kVectors: KVector[]);
  /**
   * Creates a new NubSpline with the given, precalculated values (Java's private constructor). There is no error
   * checking! So if the spline shall be clamped, uniform or bezier, you have to ensure the correctness of the knot
   * vector on your own.
   */
  constructor(parts: NubSplineParts);
  constructor(
    first: NubSpline | NubSplineParts | boolean,
    dimension?: number,
    ...rest: (ControlPointList | KVector)[]
  ) {
    if (typeof first === 'boolean') {
      // `Lists.newArrayList(kVectors)` copies the varargs; the rest parameter is already a fresh array
      this.state = stateOfControlPoints(first, dimension as number, isList(rest) ? rest[0] : (rest as KVector[]));
    } else if (first instanceof NubSpline) {
      this.state = {
        dimNUBS: first.state.dimNUBS,
        isUniform: first.state.isUniform,
        isClamped: first.state.isClamped,
        isBezier: first.state.isBezier,
        knotVector: [...first.state.knotVector],
        minKnot: first.state.minKnot,
        maxKnot: first.state.maxKnot,
        controlPoints: [...first.state.controlPoints],
      };
      this.#outerBox = first.#outerBox;
    } else {
      this.state = stateOfParts(first);
    }
  }

  // Generators ----------------------------------------------------------------------------------------------------

  /**
   * Creates a new NubSpline, that is the derivation of the given NubSpline.
   *
   * @param nubSpline The NubSpline to create the derivation from.
   * @return The derivation.
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/splines/NubSpline.java:189
   */
  static generateDerivedNUBS(nubSpline: NubSpline): NubSpline {
    return new NubSpline(deriveParts(nubSpline.state));
  }

  /**
   * Creates a new NubSpline, that is a inverted copy of the given one. The control-points will be inverted. The
   * distribution of the vectors on the knot-vector will be inverted, but the knot-vector will be sorted ascending,
   * again.
   *
   * @param nubSpline The NubSpline to create a inverted copy from.
   * @return The inverted NubSpline.
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/splines/NubSpline.java:240
   */
  static generateInvertedNUBS(nubSpline: NubSpline): NubSpline {
    return new NubSpline(invertParts(nubSpline.state));
  }

  // Getter & setter -----------------------------------------------------------------------------------------------

  /**
   * Returns the dimension of this NubSpline.
   *
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/splines/NubSpline.java:284
   */
  getDim(): number {
    return this.state.dimNUBS;
  }

  /**
   * Returns and, if necessary, calculates the outerBox of this spline. The outerBox lays around all parts of the
   * spline.
   *
   * @return A Rectangle representing a square around this NubSpline. The Rectangle is only an approximation.
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/splines/NubSpline.java:294
   */
  getOuterBox(): Rectangle {
    if (this.#outerBox === null) {
      this.calculateOuterBox();
    }
    return this.#outerBox as Rectangle;
  }

  /**
   * Sets the outer box of this NubSpline. Only use if you know what you are doing!
   *
   * @param outerRectange The outerBox of this spline.
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/splines/NubSpline.java:306
   */
  protected setOuterBox(outerRectange: Rectangle): void {
    this.#outerBox = outerRectange;
  }

  /**
   * Returns the control points. The control points may be modified, but the list itself is only a container.
   *
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/splines/NubSpline.java:316
   */
  getControlPoints(): KVectorChain {
    return getControlPoints(this.state);
  }

  /**
   * Returns the i'th control-point. May be modified.
   *
   * @param i Position of the control-point.
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/splines/NubSpline.java:331
   */
  getControlPoint(i: number): KVector {
    return this.state.controlPoints[i].getCp();
  }

  /**
   * Returns the number of controlPoints in this NubSpline.
   *
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/splines/NubSpline.java:340
   */
  getControlPointsSize(): number {
    return this.state.controlPoints.length;
  }

  /**
   * Returns a copy of the knot vector of this NubSpline.
   *
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/splines/NubSpline.java:349
   */
  getKnotVector(): number[] {
    return [...this.state.knotVector];
  }

  // Assisting methods ---------------------------------------------------------------------------------------------

  /**
   * Calculates the outerBox as the extreme values of all control points.
   *
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/splines/NubSpline.java:445
   */
  private calculateOuterBox(): void {
    this.#outerBox = new Rectangle(this.getControlPoints());
  }

  // Calculating extrema -------------------------------------------------------------------------------------------

  /**
   * Returns the first vertical point on a NubSpline.
   *
   * @param nubSpline The spline to check.
   * @param accuracy The desired accuracy.
   * @param maxRecursion The maximum number of recursions.
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/splines/NubSpline.java:572
   */
  static getFirstVerticalPoint(nubSpline: NubSpline, accuracy: number, maxRecursion: number): KVector {
    const firstDerive = NubSpline.generateDerivedNUBS(nubSpline);
    return getFirstVerticalPoint(nubSpline, firstDerive, accuracy, maxRecursion);
  }

  /**
   * Returns the last vertical point on a NubSpline.
   *
   * @param nubSpline The spline to check.
   * @param accuracy The desired accuracy.
   * @param maxRecursion The maximum number of recursions.
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/splines/NubSpline.java:599
   */
  static getLastVerticalPoint(nubSpline: NubSpline, accuracy: number, maxRecursion: number): KVector {
    const firstDerive = NubSpline.generateInvertedNUBS(NubSpline.generateDerivedNUBS(nubSpline));
    return getLastVerticalPoint(nubSpline, firstDerive, accuracy, maxRecursion);
  }

  /**
   * Returns the first horizontal point on a NubSpline.
   *
   * @param nubSpline The spline to check.
   * @param accuracy The desired accuracy.
   * @param maxRecursion The maximum number of recursions.
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/splines/NubSpline.java:626
   */
  static getFirstHorizontalPoint(nubSpline: NubSpline, accuracy: number, maxRecursion: number): KVector {
    const firstDerive = NubSpline.generateDerivedNUBS(nubSpline);
    return getFirstHorizontalPoint(nubSpline, firstDerive, accuracy, maxRecursion);
  }

  /**
   * Returns the last horizontal point on a NubSpline.
   *
   * @param nubSpline The spline to check.
   * @param accuracy The desired accuracy.
   * @param maxRecursion The maximum number of recursions.
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/splines/NubSpline.java:652
   */
  static getLastHorizontalPoint(nubSpline: NubSpline, accuracy: number, maxRecursion: number): KVector {
    const firstDerive = NubSpline.generateInvertedNUBS(NubSpline.generateDerivedNUBS(nubSpline));
    return getLastHorizontalPoint(nubSpline, firstDerive, accuracy, maxRecursion);
  }

  /**
   * Calculates a point on this NubSpline at the position of value. There is a limitation on the value to check: if the
   * NubSpline is clamped, knotVector[0] <= t <= knotVector[knotVector.size() - 1]; if it is unclamped,
   * knotVector[dim - 1] <= t <= knotVector[knotVector.size() - dim]. Java's `getPointOnCurve(t)` is the call with
   * `modify` false (the version that does not modify this Nubs).
   *
   * @param t The position on this NubSpline to calculate. Must be in the range of the knot vector.
   * @param modify Determines, if current Nubs is allowed to be modified.
   * @return The position on this NubSpline.
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/splines/NubSpline.java:709
   */
  getPointOnCurve(t: number, modify: boolean = false): KVector {
    const multiplicity = getMultiplicity(this.state, t);
    // If the multiplicity is already equal to dim, there is already a CP at the position t.
    if (multiplicity === this.state.dimNUBS) {
      return this.getControlPoint(getIndexInKnotVector(this.state, t));
    }

    // If the multiplicity is less than dim, we have to insert new knots.
    if (modify) {
      insertKnot(this.state, t, Int32.sub(this.state.dimNUBS, multiplicity));
      return this.getControlPoint(getIndexInKnotVector(this.state, t));
    } else {
      // To not modify this NubSpline, we will do so on a copy.
      const copy = new NubSpline(this);
      insertKnot(copy.state, t, Int32.sub(this.state.dimNUBS, multiplicity));
      return copy.getControlPoint(getIndexInKnotVector(copy.state, t));
    }
  }

  // Bezier --------------------------------------------------------------------------------------------------------

  /**
   * Converts this NubSpline to a bezier spline. All inner knots of the knotVector get the multiplicity of dimNUBS.
   *
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/splines/NubSpline.java:848
   */
  toBezier(): void {
    toBezier(this.state);
  }

  /**
   * Returns all bezier control points needed to create an equivalent bezier spline. If this NubSpline still not holds
   * the requirements for a bezier spline, it is converted to to so. Without arguments (Java `getBezierCP()`) the source
   * and target vector are not included in the list of control points.
   *
   * @param withSourceVector Specify if the source vector shall be included in the vector chain.
   * @param withTargetVector Specify if the target vector shall be included in the vector chain.
   * @return The bezier control-points.
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/splines/NubSpline.java:911
   */
  getBezierCP(withSourceVector: boolean = false, withTargetVector: boolean = false): KVectorChain {
    return getBezierCP(this.state, withSourceVector, withTargetVector);
  }

  // Other stuff ---------------------------------------------------------------------------------------------------

  /**
   * Generates NubSpline CPs for a nice curve.
   *
   * @return The nice CPs
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/splines/NubSpline.java:951
   */
  static generateNiceCurve(): NubSpline {
    const niceChain = new KVectorChain();
    const vector1 = new KVector(5.5, 23.0);
    const vector2 = new KVector(2.5, 12.0);
    const vector3 = new KVector(5.0, 10.0);
    const vector4 = new KVector(5.0, 9.0);
    const vector5 = new KVector(3.8, 5.5);
    const vector6 = new KVector(7.0, 4.0);
    const vector7 = new KVector(7.0, 3.5);
    const vector8 = new KVector(6.0, 2.2);
    const vector9 = new KVector(8.0, 0.5);

    niceChain.add(vector1);
    niceChain.add(vector1);
    niceChain.add(vector1);
    niceChain.add(vector2);
    niceChain.add(vector3);
    niceChain.add(vector4);
    niceChain.add(vector5);
    niceChain.add(vector6);
    niceChain.add(vector7);
    niceChain.add(vector8);
    niceChain.add(vector9);
    NubSpline.addMirrored(niceChain, vector9.x, vector8, vector7, vector6, vector5, vector4, vector3, vector2, vector1);
    NubSpline.addMirrored(niceChain, vector9.x, vector1, vector1);

    niceChain.scale(5.0);
    niceChain.offset(-50.0, -80.0);

    // Create the new NubSpline.
    return new NubSpline(true, 3, niceChain);
  }

  /**
   * Adds the mirror images (see {@link NubSpline.mirrorOnX}) of the vectors in order. The Java writes the ten
   * `niceChain.add(mirrorOnX(vectorN, vector9.x))` calls out in `generateNiceCurve`; extracted only to stay under the
   * function-size limit.
   */
  private static addMirrored(chain: KVectorChain, xVal: number, ...vectors: KVector[]): void {
    for (const vector of vectors) {
      chain.add(NubSpline.mirrorOnX(vector, xVal));
    }
  }

  /**
   * Creates a copy of the original KVector, mirrored on a line laying on the given x-value.
   *
   * @param original The original KVector.
   * @param xVal The mirror, laying parallel to the y-axis, at the given x-value.
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/splines/NubSpline.java:1000
   */
  private static mirrorOnX(original: KVector, xVal: number): KVector {
    return new KVector(xVal + xVal - original.x, original.y);
  }

  toString(): string {
    return polarCPsToString(this.state.controlPoints);
  }
}
