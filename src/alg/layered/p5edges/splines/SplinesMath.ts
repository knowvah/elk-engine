// SPDX-License-Identifier: EPL-2.0
import { KVector } from '../../../../core/math/KVector.js';
import { PortSide } from '../../../../core/options/PortSide.js';
import * as Iterables from '../../../../guava/Iterables.js';
import type { LNode } from '../../graph/LNode.js';
import type { LPort } from '../../graph/LPort.js';

/** The tolerance of the geometry comparisons. */
const EPSILON = 0.00000001;
/** What `convertKVectorToString` returns for a missing or empty vector list. */
const NULL_STRING = '(null)';
/** The separator `convertKVectorToString` puts between the vectors of a list. */
const LIST_SEPARATOR = ', ';

// some class statics to increase performance //
const HALF_PI = Math.PI / 2;
const QUATER_PI = HALF_PI / 2;
const THREE_HALF_PI = HALF_PI + HALF_PI + HALF_PI;
const TWO_PI = 2.0 * Math.PI;
const THREE = 3;

/** The `DecimalFormat("#0.0")` of `convertKVectorToString` shows one fraction digit. */
const SCALE = 10;
/** A double that is an odd multiple of 1/4 is the only kind of exact tie at one fraction digit. */
const QUARTER = 4;
/** Values from here on have no fraction digits and `toFixed` switches to exponent notation. */
const EXPONENT_FROM = 1e21;

/**
 * `new DecimalFormat("#0.0").format(value)` (HALF_EVEN, the exact binary value, `-0.0` keeps its sign). Prose only: the
 * Java `DEC_FORMAT` (`SplinesMath.java:135`) is not ported as a class (R6); `toFixed` rounds the exact value half up, so
 * the odd multiples of 1/4, the only exact ties, are rounded to the even tenth by hand.
 */
function formatOneDecimal(value: number): string {
  if (Number.isNaN(value)) {
    return 'NaN';
  }
  const sign = value < 0 || Object.is(value, -0) ? '-' : '';
  const magnitude = Math.abs(value);
  if (magnitude === Infinity) {
    return `${sign}∞`;
  }
  if (magnitude >= EXPONENT_FROM) {
    return `${sign}${BigInt(magnitude).toString()}.0`;
  }
  const quarters = magnitude * QUARTER;
  if (Number.isInteger(quarters) && quarters % 2 === 1) {
    const tenths = Math.floor(magnitude * SCALE);
    return `${sign}${((tenths % 2 === 0 ? tenths : tenths + 1) / SCALE).toFixed(1)}`;
  }
  return `${sign}${magnitude.toFixed(1)}`;
}

/**
 * Utility class for mathematical calculations related to splines. The Java constructor only throws (an `AssertionError`
 * "Instantiating utility class SplinesMath.") and has no caller, so none is ported.
 *
 * Overloads (docs/translation-rules.md 6.5): `intersect` (four vectors, or two vectors and two directions) and
 * `innerAngle` (two vectors, or two directions) are told apart by the argument types, `convertKVectorToString` by
 * the argument count and type (a vector, an iterable or the `KVector...` varargs); `isBetween(int, int, int)` and
 * `isBetween(double, double, double)` cannot be told apart at run time and are `isBetweenInt` and `isBetweenDouble`.
 * `convertKVectorToString(list)` calls the single-vector form: an overload, not a recursion (R8).
 *
 * @author tit
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/splines/SplinesMath.java
 */
export class SplinesMath {
  /** Half of PI. */
  static readonly HALF_PI: number = HALF_PI;
  /** A quarter of PI. */
  static readonly QUATER_PI: number = QUATER_PI;
  /** Three halves of PI. */
  static readonly THREE_HALF_PI: number = THREE_HALF_PI;
  /** Two times PI. */
  static readonly TWO_PI: number = TWO_PI;
  /** The constant 3. */
  static readonly THREE: number = THREE;

  /**
   * Calculates the intersection point of two lines, each given by a point and a direction (radians), or by two points
   * each.
   *
   * @return the intersection, or {@code null} if the lines are parallel or coincident.
   */
  static intersect(pt1: KVector, pt2: KVector, dirPT1: number, dirPT2: number): KVector | null;
  static intersect(pt1: KVector, pt2: KVector, pt3: KVector, pt4: KVector): KVector | null;
  static intersect(pt1: KVector, pt2: KVector, third: KVector | number, fourth: KVector | number): KVector | null {
    return typeof third === 'number' && typeof fourth === 'number'
      ? SplinesMath.intersectDirections(pt1, pt2, third, fourth)
      : SplinesMath.intersectPoints(pt1, pt2, third as KVector, fourth as KVector);
  }

  /** `intersect(KVector, KVector, double, double)`, `SplinesMath.java:67`. */
  private static intersectDirections(pt1: KVector, pt2: KVector, dirPT1: number, dirPT2: number): KVector | null {
    return SplinesMath.intersectPoints(
      pt1,
      KVector.fromAngle(dirPT1).add(pt1),
      pt2,
      KVector.fromAngle(dirPT2).add(pt2),
    );
  }

  /** `intersect(KVector, KVector, KVector, KVector)`, `SplinesMath.java:82`. */
  private static intersectPoints(pt1: KVector, pt2: KVector, pt3: KVector, pt4: KVector): KVector | null {
    const x1 = pt1.x;
    const y1 = pt1.y;
    const x2 = pt2.x;
    const y2 = pt2.y;
    const x3 = pt3.x;
    const y3 = pt3.y;
    const x4 = pt4.x;
    const y4 = pt4.y;

    const divisor = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(divisor) < EPSILON) {
      // The two lines are parallel or even coincident
      return null;
    }

    const first = x1 * y2 - y1 * x2;
    const second = x3 * y4 - y3 * x4;

    const newX = (first * (x3 - x4) - second * (x1 - x2)) / divisor;
    const newY = (first * (y3 - y4) - second * (y1 - y2)) / divisor;

    return new KVector(newX, newY);
  }

  /** Calculates the inner angle between two vectors (radians), or between two directions (radians). */
  static innerAngle(vec1: KVector, vec2: KVector): number;
  static innerAngle(dir1: number, dir2: number): number;
  static innerAngle(first: KVector | number, second: KVector | number): number {
    return typeof first === 'number'
      ? SplinesMath.innerAngleDirections(first, second as number)
      : SplinesMath.innerAngleVectors(first, second as KVector);
  }

  /** `innerAngle(KVector, KVector)`, `SplinesMath.java:115`. */
  private static innerAngleVectors(vec1: KVector, vec2: KVector): number {
    return Math.acos((vec1.x * vec2.x + vec1.y * vec2.y) / (vec1.length() * vec2.length()));
  }

  /** `innerAngle(double, double)`, `SplinesMath.java:126`. */
  private static innerAngleDirections(dir1: number, dir2: number): number {
    const retval = Math.abs(dir1 - dir2);
    return retval % Math.PI;
  }

  // elkjs-exclude-start
  // DecimalFormat not available in gwt
  /**
   * Converts a vector, a list of vectors (iterable or `KVector...` varargs) to a readable string with rounded values.
   * A missing vector and a missing or empty list give `(null)`.
   */
  static convertKVectorToString(vector: KVector | null): string;
  static convertKVectorToString(list: Iterable<KVector> | null): string;
  static convertKVectorToString(...list: KVector[]): string;
  static convertKVectorToString(...args: [KVector | Iterable<KVector> | null] | KVector[]): string {
    const only = args.length === 1 ? args[0] : undefined;
    if (only === null) {
      return NULL_STRING;
    }
    if (only instanceof KVector) {
      return SplinesMath.convertSingleKVectorToString(only);
    }
    return Symbol.iterator in Object(only)
      ? SplinesMath.convertKVectorIterableToString(only as Iterable<KVector>)
      : SplinesMath.convertKVectorArrayToString(args as KVector[]);
  }

  /** `convertKVectorToString(KVector)`, `SplinesMath.java:144`. */
  private static convertSingleKVectorToString(vector: KVector): string {
    return `(${formatOneDecimal(vector.x)},${formatOneDecimal(vector.y)})`;
  }

  /** `convertKVectorToString(KVector...)`, `SplinesMath.java:156`. */
  private static convertKVectorArrayToString(list: readonly KVector[]): string {
    if (list.length === 0) {
      return NULL_STRING;
    }
    return SplinesMath.joinKVectors(list);
  }

  /** `convertKVectorToString(Iterable<KVector>)`, `SplinesMath.java:174`. */
  private static convertKVectorIterableToString(list: Iterable<KVector>): string {
    if (Iterables.size(list) === 0) {
      return NULL_STRING;
    }
    return SplinesMath.joinKVectors(list);
  }

  /** The loop both list forms share (`SplinesMath.java:162-166` and `:180-184`, identical in the Java). */
  private static joinKVectors(list: Iterable<KVector>): string {
    let retVal = '';

    for (const vector of list) {
      retVal += SplinesMath.convertSingleKVectorToString(vector) + LIST_SEPARATOR;
    }

    return retVal.substring(0, retVal.length - LIST_SEPARATOR.length);
  }
  // elkjs-exclude-end

  /**
   * Calculates the length of the projection of {@code point} onto the line orthogonal to the given direction.
   *
   * @param direction the direction in radians.
   * @param point the point to project.
   */
  static lengthToOrthogonal(direction: number, point: KVector): number {
    let angle = SplinesMath.innerAngleDirections(direction, point.toRadians());
    let factor = 1;

    if (angle > HALF_PI) {
      // point lays in the opposite direction
      factor = -1;
      angle = angle - QUATER_PI;
    }
    return factor * Math.cos(angle) * point.length();
  }

  /** Converts the given port side to the direction (radians) the port's edges leave in. */
  static portSideToDirection(side: PortSide): number {
    switch (side) {
      case PortSide.NORTH:
        return SplinesMath.THREE_HALF_PI;
      case PortSide.EAST:
        return 0.0;
      case PortSide.SOUTH:
        return SplinesMath.HALF_PI;
      case PortSide.WEST:
        return Math.PI;
      default:
        return 0.0;
    }
  }

  /** The distance from the port to the edge of its node on the given side. */
  static distPortToNodeEdge(port: LPort, side: PortSide): number {
    const portPos = port.getPosition().clone().add(port.getAnchor());
    const nodeSize = port.getNode()!.getSize();

    switch (side) {
      case PortSide.NORTH:
        return -portPos.y;
      case PortSide.EAST:
        return -portPos.x + nodeSize.x;
      case PortSide.SOUTH:
        return -portPos.y + nodeSize.y;
      case PortSide.WEST:
        return -portPos.x;
      default:
        return 0.0;
    }
  }

  /** `isBetween(int, int, int)`, `SplinesMath.java:266`: whether {@code value} lies between the two boundaries. */
  static isBetweenInt(value: number, boundary0: number, boundary1: number): boolean {
    return value < boundary0 ? boundary1 <= value : value <= boundary1 || value === boundary0;
  }

  /** `isBetween(double, double, double)`, `SplinesMath.java:281`: whether {@code value} lies between the boundaries. */
  static isBetweenDouble(value: number, boundary0: number, boundary1: number): boolean {
    if (Math.abs(boundary0 - value) < EPSILON || Math.abs(boundary1 - value) < EPSILON) {
      return true;
    }
    return boundary0 - value > EPSILON ? value - boundary1 > EPSILON : boundary1 - value > EPSILON;
  }

  /** The margin of the node on the given side. */
  static getMarginOnPortSide(node: LNode, side: PortSide): number {
    switch (side) {
      case PortSide.NORTH:
        return node.getMargin().top;
      case PortSide.EAST:
        return node.getMargin().right;
      case PortSide.SOUTH:
        return node.getMargin().bottom;
      case PortSide.WEST:
        return node.getMargin().left;
      default:
        return 0.0;
    }
  }
}
