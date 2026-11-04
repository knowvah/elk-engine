// SPDX-License-Identifier: EPL-2.0
import { toString as doubleToString } from '../../../../java/lang/DoubleToString.js';
import { KVector } from '../../../../core/math/KVector.js';
import { SplinesMath } from './SplinesMath.js';

/**
 * Doubles with a difference less than this value will be assumed to be equal. Java's private
 * `NubSpline.EPSILON`; it lives here, in the leaf of the `NubSpline` section files, because the nested `PolarCP`
 * uses it and every section may import this file without a cycle.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/splines/NubSpline.java:48
 */
export const EPSILON = 0.000001;

/** Java `List<Double>.toString()`: `[a, b, c]` with Java's double formatting. */
function listToString(values: readonly number[]): string {
  return '[' + values.map((value) => doubleToString(value)).join(', ') + ']';
}

/** The fields the three-argument `PolarCP` constructor computes. */
interface PolarCPFields {
  readonly cp: KVector;
  readonly polarCoordinate: number[];
}

/**
 * The body of Java's `PolarCP(PolarCP firstCP, PolarCP secondCP, double newKnot)`: computes the new control point and
 * its polar coordinate. Split from the constructor because a TypeScript constructor dispatching three Java overloads
 * would exceed the complexity limit.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/splines/NubSpline.java:1060
 */
function combine(firstCP: NubSplinePolarCP, secondCP: NubSplinePolarCP, newKnot: number): PolarCPFields {
  const firstFactor = firstCP.polarCoordinate[0];
  const secondFactor = secondCP.polarCoordinate[secondCP.polarCoordinate.length - 1];

  // vectorC = ((b-c) * vectorA + (c-a) * vectorB) / (b-a)
  const aScaled = firstCP.cp.clone().scale(secondFactor - newKnot);
  const bScaled = secondCP.cp.clone().scale(newKnot - firstFactor);
  const total = aScaled.add(bScaled);
  total.scale(1.0 / (secondFactor - firstFactor));

  const polarCoordinate: number[] = [];

  // Specifies, if the newKnot still needs to be added.
  let needsToBeAdded = true;

  // From the firstCP, we will take the W. (See method comment)
  for (let i = 1; i < firstCP.polarCoordinate.length; i++) {
    const nextKnot = firstCP.polarCoordinate[i];
    if (needsToBeAdded && nextKnot - newKnot > EPSILON) {
      polarCoordinate.push(newKnot);
      needsToBeAdded = false;
    }
    polarCoordinate.push(nextKnot);
  }
  if (needsToBeAdded) {
    polarCoordinate.push(newKnot);
  }
  return { cp: total, polarCoordinate };
}

/**
 * Represents a control point of a {@link NubSpline} including its polar coordinate. Java's nested
 * `NubSpline.PolarCP` (M15 file naming); `protected static final` there, package-wide here.
 *
 * The three Java constructors are overloads: `(controlPoint, polarCoordinate)` and the copy constructor clone their
 * arguments; `(firstCP, secondCP, newKnot)` computes the control point of the knot insertion (requirements on the polar
 * coordinates are not checked: firstCP.polarCoordinates = (xW), secondCP.polarCoordinates = (Wy), resulting
 * polarCoordinate = (Wz), properly ordered).
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/splines/NubSpline.java:1018
 */
export class NubSplinePolarCP {
  /** The control point. */
  cp: KVector;
  /** The polar coordinate. (size is always = dim) */
  polarCoordinate: number[];

  /** Constructs a new PolarCP from the given parameters; both are copied. */
  constructor(controlPoint: KVector, polarCoordinate: readonly number[]);
  /** Copy constructor. All fields are created newly. */
  constructor(polarCP: NubSplinePolarCP);
  /** Calculates the new PolarCP from two given ones for the inserted knot. */
  constructor(firstCP: NubSplinePolarCP, secondCP: NubSplinePolarCP, newKnot: number);
  constructor(first: KVector | NubSplinePolarCP, second?: readonly number[] | NubSplinePolarCP, newKnot?: number) {
    if (first instanceof KVector) {
      this.cp = first.clone();
      this.polarCoordinate = [...(second as readonly number[])];
    } else if (second === undefined) {
      this.cp = first.getCp().clone();
      this.polarCoordinate = [...first.getPolarCoordinate()];
    } else {
      const fields = combine(first, second as NubSplinePolarCP, newKnot as number);
      this.cp = fields.cp;
      this.polarCoordinate = fields.polarCoordinate;
    }
  }

  /** Returns the current control-point. May be modified. */
  getCp(): KVector {
    return this.cp;
  }

  /** Sets the control-point. Vector is not copied! */
  setCp(cp: KVector): void {
    this.cp = cp;
  }

  /** Returns the polar-coordinate. May be modified. */
  getPolarCoordinate(): number[] {
    return this.polarCoordinate;
  }

  /** Sets the polar-coordinate. */
  setPolarCoordinate(polarCoordinate: number[]): void {
    this.polarCoordinate = polarCoordinate;
  }

  toString(): string {
    return listToString(this.polarCoordinate) + ' ' + SplinesMath.convertKVectorToString(this.cp);
  }
}

/** `List<PolarCP>.toString()` of the Java `NubSpline.toString`: `[a, b]` with each element's `toString`. */
export function polarCPsToString(controlPoints: readonly NubSplinePolarCP[]): string {
  return '[' + controlPoints.map((controlPoint) => controlPoint.toString()).join(', ') + ']';
}
