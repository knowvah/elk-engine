// SPDX-License-Identifier: EPL-2.0
import { toString as doubleToString } from '../../java/lang/DoubleToString.js';
import { add as int32Add, mul as int32Mul } from '../../java/lang/Int32.js';
import { doubleToLongBits, hashCode as doubleHashCode } from '../../java/lang/JavaDouble.js';
import type { HashStrategy } from '../../java/util/HashStrategy.js';
import { hashable } from '../../java/util/HashStrategy.js';
import type { KVector } from '../../core/math/KVector.js';
import type { Quadrant } from './PointQuadrant.js';

/** The multiplier of `Arrays.hashCode` (and so `Objects.hash`). */
const HASH_MULTIPLIER = 31;

/**
 * A point, optionally associated with a quadrant, used by the rectilinear convex hull. The two
 * Java constructors `Point(x, y)` and `Point(x, y, quadrant)` are one constructor with an optional
 * parameter.
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/Point.java
 */
export class Point {
  /** The x coordinate. */
  x: number;
  /** The y coordinate. */
  y: number;

  /** The quadrant this point is located in (`null` as in Java if unset). */
  quadrant: Quadrant | null = null;
  /** Whether the point represents a convex point in the rectilinear convex hull. */
  convex = true;

  constructor(x: number, y: number, quadrant?: Quadrant) {
    this.x = x;
    this.y = y;
    if (quadrant !== undefined) {
      this.quadrant = quadrant;
    }
  }

  /**
   * @param v a {@link KVector}
   * @returns for the passed vector v returns a new point (v.x, v.y)
   */
  static from(v: KVector): Point {
    return new Point(v.x, v.y);
  }

  toString(): string {
    return `(${doubleToString(this.x)}, ${doubleToString(this.y)}${this.convex ? 'cx' : ''}${String(this.quadrant)})`;
  }

  /** `getClass() == obj.getClass()`, then `Objects.equals` of the boxed doubles. */
  equals(obj: unknown): boolean {
    if (obj === null || obj === undefined) {
      return false;
    }
    if (Object.getPrototypeOf(obj) !== Object.getPrototypeOf(this)) {
      return false;
    }

    const p2 = obj as Point;
    return doubleToLongBits(this.x) === doubleToLongBits(p2.x) && doubleToLongBits(this.y) === doubleToLongBits(p2.y);
  }

  /** `Objects.hash(x, y)`: `Arrays.hashCode` over the boxed doubles. */
  hashCode(): number {
    let result = 1;
    for (const value of [this.x, this.y]) {
      result = int32Add(int32Mul(HASH_MULTIPLIER, result), doubleHashCode(value));
    }
    return result;
  }
}

/** Key protocol for `JavaHashSet`/`JavaHashMap` sites keyed by {@link Point}: `Point.hashCode`/`equals`. */
export const POINT_STRATEGY: HashStrategy<Point> = hashable<Point>();
