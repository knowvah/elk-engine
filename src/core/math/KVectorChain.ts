// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { IllegalStateException } from '../../java/lang/IllegalStateException.js';
import { IndexOutOfBoundsException } from '../../java/lang/IndexOutOfBoundsException.js';
import { parseDouble } from '../../java/lang/JavaDouble.js';
import { NumberFormatException } from '../../java/lang/NumberFormatException.js';
import { toString as doubleToString } from '../../java/lang/DoubleToString.js';
import { LinkedList } from '../../java/util/LinkedList.js';
import type { ListIterator } from '../../java/util/ListIterator.js';
import * as JavaString from '../../java/lang/JavaString.js';
import type { IDataObject } from '../util/IDataObject.js';
import { KVector } from './KVector.js';

/** The token delimiters of {@link KVectorChain.parse}: Java regex `,|;|\(|\)|\[|\]|\{|\}| |\t|\n`. */
const TOKEN_DELIMITERS = /,|;|\(|\)|\[|\]|\{|\}| |\t|\n/;
/** Tokens alternate between x and y; this is the number of coordinates per vector. */
const COORDINATE_COUNT = 2;

/** The argument shapes of the constructor: nothing, a collection, or the vectors themselves. */
type ConstructorArgs = [] | [Iterable<KVector>] | KVector[];
/** The argument shapes of the `add*` family: a (0,0) vector, a vector, or its coordinates. */
type VectorArgs = [] | [KVector] | [number, number];

/** Whether the arguments are the vectors themselves (`KVector...`) rather than a collection. */
function isVarargs(args: ConstructorArgs): args is KVector[] {
  return args.every((arg) => arg instanceof KVector);
}

/** The vector the `add*` overloads append: Java `add()`, `add(KVector)` and `add(double, double)`. */
function vectorOf(args: VectorArgs): KVector {
  if (args.length === 0) {
    return new KVector();
  }
  return args.length === 1 ? args[0] : new KVector(args[0], args[1]);
}

/**
 * A chain of vectors. Can be used to describe polylines or similar constructs.
 *
 * The constructors `KVectorChain(Collection<KVector>)` and `KVectorChain(KVector...)` are one
 * overloaded constructor: a single argument that is not a {@link KVector} is the collection
 * (any iterable), otherwise the arguments are the vectors. Likewise `addAll(KVector...)` and the
 * inherited `addAll(Collection)` share one method.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/math/KVectorChain.java
 */
export class KVectorChain extends LinkedList<KVector> implements IDataObject {
  /** Creates an empty vector chain. */
  constructor();
  /** Creates a vector chain from a given collection of vectors. */
  constructor(collection: Iterable<KVector>);
  /** Creates a vector chain from a given vector array. */
  constructor(...vectors: KVector[]);
  constructor(...args: ConstructorArgs) {
    super(isVarargs(args) ? undefined : args[0]);
    if (isVarargs(args)) {
      this.addAll(...args);
    }
  }

  override toString(): string {
    let builder = '(';
    const iter = this.listIterator();
    while (iter.hasNext()) {
      const vector = iter.next();
      builder += doubleToString(vector.x) + ',' + doubleToString(vector.y);
      if (iter.hasNext()) {
        builder += '; ';
      }
    }
    return builder + ')';
  }

  /**
   * Returns an array containing the elements of this vector chain, or of a subsequence of it.
   *
   * @param beginIndex the index of the first element to include in the returned array
   * @return an array containing the elements starting from the given index
   */
  override toArray(beginIndex?: number): KVector[] {
    if (beginIndex === undefined) {
      return collect(this.listIterator());
    }
    if (beginIndex < 0 || beginIndex > this.size()) {
      throw new IndexOutOfBoundsException();
    }
    return collect(this.listIterator(beginIndex));
  }

  /**
   * Split from the Java body (complexity limits): the splitting and clearing stay here, the token
   * loop of the `try` block is {@link KVectorChain.parseTokens}.
   */
  parse(string: string): void {
    const tokens = JavaString.split(string, TOKEN_DELIMITERS);
    // String::split may contain empty strings whenever two delimiters follow each other
    // e.g. ";]{" would result in an array of 3 empty strings.
    // We ignore empty strings.
    this.clear();
    try {
      this.parseTokens(tokens);
    } catch (exception) {
      if (exception instanceof NumberFormatException) {
        throw new IllegalArgumentException(
          'The given string does not match the expected format for vectors.' + String(exception),
        );
      }
      throw exception;
    }
  }

  /** The `try` block of the Java `parse`: pairs up the non-blank tokens as x and y. */
  private parseTokens(tokens: string[]): void {
    // an extra token is ignored
    let i = 0;
    let xy = 0;
    let x = 0;
    let y = 0;
    while (i < tokens.length) {
      // Java also tests `tokens[i] != null`; split results never hold null
      if (JavaString.trim(tokens[i]).length > 0) {
        if (xy % COORDINATE_COUNT === 0) {
          x = parseDouble(tokens[i]);
        } else {
          y = parseDouble(tokens[i]);
        }
        if (xy > 0 && xy % COORDINATE_COUNT !== 0) {
          this.add(new KVector(x, y));
        }
        xy++;
      }
      i++;
    }
  }

  /**
   * Adds a vector to the end of the vector chain: the given one, (x,y), or (0,0) without arguments.
   */
  override add(e: KVector): boolean;
  override add(): void;
  override add(x: number, y: number): void;
  override add(...args: VectorArgs): boolean | undefined {
    if (args.length === 1) {
      return super.add(args[0]);
    }
    this.add(vectorOf(args));
    return undefined;
  }

  /**
   * Adds a vector to the beginning of the vector chain: the given one, (x,y), or (0,0) without
   * arguments.
   */
  override addFirst(e: KVector): void;
  override addFirst(): void;
  override addFirst(x: number, y: number): void;
  override addFirst(...args: VectorArgs): void {
    super.addFirst(vectorOf(args));
  }

  /**
   * Adds a vector to the end of the vector chain: the given one, (x,y), or (0,0) without arguments.
   */
  override addLast(e: KVector): void;
  override addLast(): void;
  override addLast(x: number, y: number): void;
  override addLast(...args: VectorArgs): void {
    super.addLast(vectorOf(args));
  }

  /**
   * Add all the vectors in the given array (varargs) or collection to the end of this vector chain.
   */
  override addAll(c: Iterable<KVector>): boolean;
  override addAll(...vectors: KVector[]): void;
  override addAll(...args: ConstructorArgs): boolean | undefined {
    if (isVarargs(args)) {
      for (const vector of args) {
        this.add(vector);
      }
      return undefined;
    }
    return super.addAll(args[0]);
  }

  /**
   * Add copies of all the vectors to this chain, starting at the given index.
   *
   * @param index where to start adding the vectors.
   * @param chain the vector chain whose vectors to copy here.
   */
  addAllAsCopies(index: number, chain: Iterable<KVector>): void {
    const copies = new LinkedList<KVector>();
    for (const v of chain) {
      copies.add(new KVector(v));
    }

    this.addAllAt(index, copies);
  }

  /**
   * Iterate through all vectors and scale them by the given amount, optionally with different
   * values for X and Y coordinate.
   *
   * @return this
   */
  scale(scale: number): KVectorChain;
  scale(scalex: number, scaley: number): KVectorChain;
  scale(...args: [number] | [number, number]): KVectorChain {
    for (const vector of this) {
      if (args.length === 1) {
        vector.scale(args[0]);
      } else {
        vector.scale(args[0], args[1]);
      }
    }
    return this;
  }

  /**
   * Iterate through all vectors and add the offset to them, given as a vector or as dx and dy.
   *
   * @return this
   */
  offset(offset: KVector): KVectorChain;
  offset(dx: number, dy: number): KVectorChain;
  offset(...args: [KVector] | [number, number]): KVectorChain {
    for (const vector of this) {
      if (args.length === 1) {
        vector.add(args[0]);
      } else {
        vector.add(args[0], args[1]);
      }
    }
    return this;
  }

  /**
   * Iterate through all vectors and add the offset to them without mutating.
   *
   * @param offset the offset to add to the vectors.
   * @return A new vector chain
   */
  offsetNonMutating(offset: KVector): KVectorChain {
    const result = new KVectorChain();
    for (const vector of this) {
      result.add(KVector.sum(vector, offset));
    }
    return result;
  }

  /**
   * Calculate the total length of this vector chain.
   *
   * @return the total length
   */
  totalLength(): number {
    let length = 0;
    if (this.size() >= 2) {
      const iter = this.listIterator();
      let point1 = iter.next();
      do {
        const point2 = iter.next();
        length += point1.distance(point2);
        point1 = point2;
      } while (iter.hasNext());
    }
    return length;
  }

  /**
   * Determine whether any of the contained vectors is NaN.
   *
   * @return true if one of the vectors is NaN
   */
  hasNaN(): boolean {
    for (const v of this) {
      if (v.isNaN()) {
        return true;
      }
    }
    return false;
  }

  /**
   * Determine whether any of the contained vectors is infinite.
   *
   * @return true if one of the vectors is infinite
   */
  hasInfinite(): boolean {
    for (const v of this) {
      if (v.isInfinite()) {
        return true;
      }
    }
    return false;
  }

  /**
   * Calculate a point on this vector chain with given distance. The result is a point whose
   * distance from the first point on the chain equals the given distance. If the parameter is
   * negative, the result is mirrored, i.e. the distance is seen from the last point on the chain.
   * The vector chain must contain at least one point.
   *
   * Split from the Java body (complexity limits): the two traversal directions are
   * {@link KVectorChain.pointOnLineForward} and {@link KVectorChain.pointOnLineBackward}.
   *
   * @param dist the distance from the first point (if positive) or the last point (if negative)
   * @return a point on the vector chain
   */
  pointOnLine(dist: number): KVector {
    if (this.size() >= 2) {
      const absDistance = Math.abs(dist);
      if (dist >= 0) {
        // traverse the points in normal direction
        return this.pointOnLineForward(absDistance);
      } else {
        // traverse the points in reversed direction
        return this.pointOnLineBackward(absDistance);
      }
    } else if (this.size() === 1) {
      return this.get(0);
    } else {
      throw new IllegalStateException('Cannot determine a point on an empty vector chain.');
    }
  }

  /** The `dist >= 0` branch of {@link KVectorChain.pointOnLine}; the chain has at least two points. */
  private pointOnLineForward(absDistance: number): KVector {
    let distanceSum = 0;
    const iter = this.listIterator();
    let currentPoint = iter.next();
    do {
      const oldDistanceSum = distanceSum;
      const nextPoint = iter.next();
      const additionalDistanceToNext = currentPoint.distance(nextPoint);
      if (additionalDistanceToNext > 0) {
        distanceSum += additionalDistanceToNext;
        if (distanceSum >= absDistance) {
          const thisRelative = (absDistance - oldDistanceSum) / additionalDistanceToNext;
          const result = nextPoint.clone().sub(currentPoint);
          result.scale(thisRelative);
          result.add(currentPoint);
          return result;
        }
      }
      currentPoint = nextPoint;
    } while (iter.hasNext());
    return iter.previous();
  }

  /** The `dist < 0` branch of {@link KVectorChain.pointOnLine}; the chain has at least two points. */
  private pointOnLineBackward(absDistance: number): KVector {
    let distanceSum = 0;
    const iter = this.listIterator(this.size() - 1);
    let currentPoint = iter.previous();
    do {
      const oldDistanceSum = distanceSum;
      const nextPoint = iter.previous();
      const additionalDistanceToNext = currentPoint.distance(nextPoint);
      if (additionalDistanceToNext > 0) {
        distanceSum += additionalDistanceToNext;
        if (distanceSum >= absDistance) {
          const thisRelative = (absDistance - oldDistanceSum) / additionalDistanceToNext;
          const result = nextPoint.clone().sub(currentPoint);
          result.scale(thisRelative);
          result.add(currentPoint);
          return result;
        }
      }
      currentPoint = nextPoint;
    } while (iter.hasPrevious());
    return iter.next();
  }

  /**
   * Calculate the angle of a line segment of this vector chain with given distance. The angle is
   * measured on the point whose distance from the first point on the chain equals the given
   * distance. If the parameter is negative, the result is mirrored, i.e. the distance is seen
   * from the last point on the chain and the angle is rotated by pi. The vector chain must contain
   * at least two points.
   *
   * Split from the Java body (complexity limits): the two traversal directions are
   * {@link KVectorChain.angleOnLineForward} and {@link KVectorChain.angleOnLineBackward}.
   *
   * @param dist the distance from the first point (if positive) or the last point (if negative)
   * @return an angle on the vector chain in radians
   */
  angleOnLine(dist: number): number {
    if (this.size() >= 2) {
      const absDistance = Math.abs(dist);
      if (dist >= 0) {
        // traverse the points in normal direction
        return this.angleOnLineForward(absDistance);
      } else {
        // traverse the points in reversed direction
        return this.angleOnLineBackward(absDistance);
      }
    } else {
      throw new IllegalStateException('Need at least two points to determine an angle.');
    }
  }

  /** The `dist >= 0` branch of {@link KVectorChain.angleOnLine}; the chain has at least two points. */
  private angleOnLineForward(absDistance: number): number {
    let distanceSum = 0;
    const iter = this.listIterator();
    let currentPoint: KVector;
    let nextPoint = iter.next();
    do {
      currentPoint = nextPoint;
      nextPoint = iter.next();
      const additionalDistanceToNext = currentPoint.distance(nextPoint);
      if (additionalDistanceToNext > 0) {
        distanceSum += additionalDistanceToNext;
        if (distanceSum >= absDistance) {
          // the line segment has been found
          break;
        }
      }
    } while (iter.hasNext());
    return nextPoint.clone().sub(currentPoint).toRadians();
  }

  /** The `dist < 0` branch of {@link KVectorChain.angleOnLine}; the chain has at least two points. */
  private angleOnLineBackward(absDistance: number): number {
    let distanceSum = 0;
    const iter = this.listIterator(this.size() - 1);
    let currentPoint: KVector;
    let nextPoint = iter.previous();
    do {
      currentPoint = nextPoint;
      nextPoint = iter.previous();
      const additionalDistanceToNext = currentPoint.distance(nextPoint);
      if (additionalDistanceToNext > 0) {
        distanceSum += additionalDistanceToNext;
        if (distanceSum >= absDistance) {
          // the line segment has been found
          break;
        }
      }
    } while (iter.hasPrevious());
    return nextPoint.clone().sub(currentPoint).toRadians();
  }

  /**
   * Returns a new vector chain that is the reverse of the given vector chain. The returned vector
   * chain is a deep copy in the sense that a change to a {@link KVector} instance in the old
   * chain doesn't affect any vectors in the new chain.
   *
   * @param chain the chain to be reversed.
   * @return a new vector chain that is the reverse of the old one.
   */
  static reverse(chain: KVectorChain): KVectorChain {
    const result = new KVectorChain();

    for (const vector of chain) {
      result.addAt(0, new KVector(vector));
    }

    return result;
  }
}

/** Drains the iterator into an array (Java: `result[i++] = iter.next()` into a sized array). */
function collect(iter: ListIterator<KVector>): KVector[] {
  const result: KVector[] = [];
  while (iter.hasNext()) {
    result.push(iter.next());
  }
  return result;
}
