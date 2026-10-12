// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { add as int32Add } from '../../java/lang/Int32.js';
import { hashCode as doubleHashCode, parseDouble } from '../../java/lang/JavaDouble.js';
import { reverse as integerReverse } from '../../java/lang/JavaInteger.js';
import { NumberFormatException } from '../../java/lang/NumberFormatException.js';
import { toString as doubleToString } from '../../java/lang/DoubleToString.js';
import type { Random } from '../../java/util/Random.js';
import * as JavaString from '../../java/lang/JavaString.js';
import type { IDataObject } from '../util/IDataObject.js';

/** the default fuzzyness used when comparing two vectors fuzzily. */
const DEFAULT_FUZZYNESS = 0.05;

/** Characters skipped in front of the numbers by {@link KVector.parse}. */
const LEADING_DELIMITERS = '([{"\' \t\r\n';
/** Characters skipped behind the numbers by {@link KVector.parse}. */
const TRAILING_DELIMITERS = ')]}"\' \t\r\n';
/** The token separators of {@link KVector.parse}: Java regex `,|;|\r|\n`. */
const TOKEN_SEPARATORS = /,|;|\r|\n/;
/** Number of coordinates a parsed vector consists of. */
const COORDINATE_COUNT = 2;
/** Radians to degrees, as `Math.toDegrees` (Javadoc: approximately equal to the angle in degrees). */
const RADIANS_TO_DEGREES = 180 / Math.PI;

/**
 * A simple 2D vector class which supports translation, scaling, normalization etc.
 *
 * `Cloneable` is carried by {@link KVector.clone}; `Serializable` is dropped. The overloads of the
 * Java constructors that clash at runtime are split: `KVector(double angle)` is
 * {@link KVector.fromAngle}.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/math/KVector.java
 */
export class KVector implements IDataObject {
  /** x coordinate. */
  x = 0.0;
  /** y coordinate. */
  y = 0.0;

  /** Create vector with default coordinates (0,0). */
  constructor();
  /** Constructs a new vector from given values. */
  constructor(thex: number, they: number);
  /** Creates an exact copy of a given vector v. */
  constructor(v: KVector);
  /** Creates a new vector that points from the given start to the end vector. */
  constructor(start: KVector, end: KVector);
  constructor(first?: number | KVector, second?: number | KVector) {
    if (typeof first === 'number' && typeof second === 'number') {
      this.x = first;
      this.y = second;
    } else if (first instanceof KVector && second instanceof KVector) {
      this.x = second.x - first.x;
      this.y = second.y - first.y;
    } else if (first instanceof KVector) {
      this.x = first.x;
      this.y = first.y;
    }
  }

  /**
   * Creates a normalized vector for the passed angle in radians (Java `KVector(double angle)`).
   *
   * @param angle angle in radians.
   */
  static fromAngle(angle: number): KVector {
    return new KVector(Math.cos(angle), Math.sin(angle));
  }

  /**
   * Returns an exact copy of this vector.
   *
   * @return identical vector
   */
  clone(): KVector {
    return new KVector(this.x, this.y);
  }

  toString(): string {
    return '(' + doubleToString(this.x) + ',' + doubleToString(this.y) + ')';
  }

  equals(obj: unknown): boolean {
    if (obj instanceof KVector) {
      return this.x === obj.x && this.y === obj.y;
    } else {
      return false;
    }
  }

  /**
   * Compares if this and the given vector are approximately equal. What <i>approximately</i>
   * means is defined by the fuzzyness: for both x and y coordinate, the two vectors may only
   * differ by at most the fuzzyness to still be considered equal. (Java overloads
   * `equalsFuzzily(KVector)` and `equalsFuzzily(KVector, double)` merge into one default.)
   *
   * @param other the vector to compare this vector to.
   * @param fuzzyness the maximum difference per dimension that is still considered equal.
   * @return `true` if the vectors are approximately equal, `false` otherwise.
   */
  equalsFuzzily(other: KVector, fuzzyness: number = DEFAULT_FUZZYNESS): boolean {
    return Math.abs(this.x - other.x) <= fuzzyness && Math.abs(this.y - other.y) <= fuzzyness;
  }

  hashCode(): number {
    return int32Add(doubleHashCode(this.x), integerReverse(doubleHashCode(this.y)));
  }

  /**
   * returns this vector's length.
   *
   * @return Math.sqrt(x*x + y*y)
   */
  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  /**
   * returns square length of this vector.
   *
   * @return x*x + y*y
   */
  squareLength(): number {
    return this.x * this.x + this.y * this.y;
  }

  /**
   * Set vector to (0,0).
   *
   * @return `this`
   */
  reset(): KVector {
    this.x = 0.0;
    this.y = 0.0;
    return this;
  }

  /**
   * Resets this vector to the value of the other vector, or to the given values.
   *
   * @return `this`
   */
  set(other: KVector): KVector;
  set(newX: number, newY: number): KVector;
  set(...args: [KVector] | [number, number]): KVector {
    if (args.length === 1) {
      this.x = args[0].x;
      this.y = args[0].y;
    } else {
      this.x = args[0];
      this.y = args[1];
    }
    return this;
  }

  /**
   * Vector addition, or translation by the given amount.
   *
   * @return `this`
   */
  add(v: KVector): KVector;
  add(dx: number, dy: number): KVector;
  add(...args: [KVector] | [number, number]): KVector {
    if (args.length === 1) {
      this.x += args[0].x;
      this.y += args[0].y;
    } else {
      this.x += args[0];
      this.y += args[1];
    }
    return this;
  }

  /**
   * Returns the sum of arbitrarily many vectors as a new vector instance.
   *
   * @param vs vectors to be added
   * @return a new vector containing the sum of given vectors
   */
  static sum(...vs: KVector[]): KVector {
    const sum = new KVector();
    for (const v of vs) {
      sum.x += v.x;
      sum.y += v.y;
    }
    return sum;
  }

  /**
   * Vector subtraction, or translation by subtracting the given amount.
   *
   * @return `this`
   */
  sub(v: KVector): KVector;
  sub(dx: number, dy: number): KVector;
  sub(...args: [KVector] | [number, number]): KVector {
    if (args.length === 1) {
      this.x -= args[0].x;
      this.y -= args[0].y;
    } else {
      this.x -= args[0];
      this.y -= args[1];
    }
    return this;
  }

  /**
   * Returns the difference of two vectors as a new vector instance.
   *
   * @param v1 the minuend
   * @param v2 the subtrahend
   * @return a new vector containing the difference of given vectors
   */
  static diff(v1: KVector, v2: KVector): KVector {
    return new KVector(v1.x - v2.x, v1.y - v2.y);
  }

  /**
   * Scale the vector, optionally with different values for X and Y coordinate.
   *
   * @return `this`
   */
  scale(scale: number): KVector;
  scale(scalex: number, scaley: number): KVector;
  scale(...args: [number] | [number, number]): KVector {
    if (args.length === 1) {
      this.x *= args[0];
      this.y *= args[0];
    } else {
      this.x *= args[0];
      this.y *= args[1];
    }
    return this;
  }

  /**
   * Normalize the vector.
   *
   * @return `this`
   */
  normalize(): KVector {
    const length = this.length();
    if (length > 0) {
      this.x /= length;
      this.y /= length;
    }
    return this;
  }

  /**
   * scales this vector to the passed length.
   *
   * @param length length to scale to
   * @return `this`
   */
  scaleToLength(length: number): KVector {
    this.normalize();
    this.scale(length);
    return this;
  }

  /**
   * Negate the vector.
   *
   * @return `this`
   */
  negate(): KVector {
    this.x = -this.x;
    this.y = -this.y;
    return this;
  }

  /**
   * Returns angle representation of this vector in degree. The length of the vector must not be 0.
   *
   * @return value within [0,360)
   */
  toDegrees(): number {
    return this.toRadians() * RADIANS_TO_DEGREES;
  }

  /**
   * Returns angle representation of this vector in radians. The length of the vector must not be 0.
   *
   * @return value within [0,2*pi)
   */
  toRadians(): number {
    const length = this.length();
    // Java: `assert length > 0;` (disabled unless the JVM runs with -ea; docs/translation-rules.md 6.8)

    if (this.x >= 0 && this.y >= 0) {
      // 1st quadrant
      return Math.asin(this.y / length);
    } else if (this.x < 0) {
      // 2nd or 3rd quadrant
      return Math.PI - Math.asin(this.y / length);
    } else {
      // 4th quadrant
      return 2 * Math.PI + Math.asin(this.y / length);
    }
  }

  /**
   * Add some "noise" to this vector.
   *
   * @param random the random number generator
   * @param amount the amount of noise to add
   */
  wiggle(random: Random, amount: number): void {
    this.x += random.nextDouble() * amount - amount / 2;
    this.y += random.nextDouble() * amount - amount / 2;
  }

  /**
   * Returns the distance between two vectors.
   *
   * @param v2 second vector
   * @return distance between this and second vector
   */
  distance(v2: KVector): number {
    const dx = this.x - v2.x;
    const dy = this.y - v2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Returns the dot product of the two given vectors.
   *
   * @param v2 second vector
   * @return this.x * v2.x + this.y * v2.y
   */
  dotProduct(v2: KVector): number {
    return this.x * v2.x + this.y * v2.y;
  }

  /**
   * Calculates the cross product of two vectors v and w.
   *
   * @return the cross product of v and w
   */
  static crossProduct(v: KVector, w: KVector): number {
    return v.x * w.y - v.y * w.x;
  }

  /**
   * Rotates this vector by the angle provided in radians. Rotation is anti-clockwise.
   *
   * @return the rotated vector
   */
  rotate(angle: number): KVector {
    const newX = this.x * Math.cos(angle) - this.y * Math.sin(angle);
    this.y = this.x * Math.sin(angle) + this.y * Math.cos(angle);
    this.x = newX;
    return this;
  }

  /**
   * Returns the angle between this vector and another given vector in radians.
   *
   * @return angle between vectors
   */
  angle(other: KVector): number {
    return Math.acos(this.dotProduct(other) / (this.length() * other.length()));
  }

  /**
   * Apply the given bounds to this vector.
   *
   * @param lowx the lower bound for x coordinate
   * @param lowy the lower bound for y coordinate
   * @param highx the upper bound for x coordinate
   * @param highy the upper bound for y coordinate
   * @return `this`
   * @throws IllegalArgumentException if highx < lowx or highy < lowy
   */
  bound(lowx: number, lowy: number, highx: number, highy: number): KVector {
    if (highx < lowx || highy < lowy) {
      throw new IllegalArgumentException('The highx must be bigger then lowx and the highy must be bigger then lowy');
    }
    if (this.x < lowx) {
      this.x = lowx;
    } else if (this.x > highx) {
      this.x = highx;
    }
    if (this.y < lowy) {
      this.y = lowy;
    } else if (this.y > highy) {
      this.y = highy;
    }
    return this;
  }

  /**
   * Determine whether any of the two values are NaN.
   *
   * @return true if x is NaN or y is NaN
   */
  isNaN(): boolean {
    return Number.isNaN(this.x) || Number.isNaN(this.y);
  }

  /**
   * Determine whether any of the two values are infinite.
   *
   * @return true if x is infinite or y is infinite
   */
  isInfinite(): boolean {
    return isInfiniteDouble(this.x) || isInfiniteDouble(this.y);
  }

  parse(string: string): void {
    let start = 0;
    while (start < string.length && isdelim(string.charAt(start), LEADING_DELIMITERS)) {
      start++;
    }
    let end = string.length;
    while (end > 0 && isdelim(string.charAt(end - 1), TRAILING_DELIMITERS)) {
      end--;
    }
    if (start >= end) {
      throw new IllegalArgumentException('The given string does not contain any numbers.');
    }
    const tokens = JavaString.split(string.substring(start, end), TOKEN_SEPARATORS);
    if (tokens.length !== COORDINATE_COUNT) {
      throw new IllegalArgumentException('Exactly two numbers are expected, ' + tokens.length + ' were found.');
    }
    try {
      this.x = parseDouble(JavaString.trim(tokens[0]));
      this.y = parseDouble(JavaString.trim(tokens[1]));
    } catch (exception) {
      if (exception instanceof NumberFormatException) {
        throw new IllegalArgumentException(
          'The given string contains parts that cannot be parsed as numbers.' + String(exception),
        );
      }
      throw exception;
    }
  }
}

/** `Double.isInfinite`. */
function isInfiniteDouble(value: number): boolean {
  return value === Infinity || value === -Infinity;
}

/**
 * Determine whether the given character is a delimiter.
 *
 * @param c a character
 * @param delims a string of possible delimiters
 * @return true if `c` is one of the characters in `delims`
 */
function isdelim(c: string, delims: string): boolean {
  for (let i = 0; i < delims.length; i++) {
    if (c === delims.charAt(i)) {
      return true;
    }
  }
  return false;
}
