// SPDX-License-Identifier: EPL-2.0
import { toString as doubleToString } from '../../java/lang/DoubleToString.js';
import { add as int32Add, mul as int32Mul } from '../../java/lang/Int32.js';
import { doubleToLongBits, hashCode as doubleHashCode } from '../../java/lang/JavaDouble.js';
import { KVector } from './KVector.js';

/** The multiplier of `Arrays.hashCode` (and so `Objects.hash`). */
const HASH_MULTIPLIER = 31;

/** `Objects.equals(Double, Double)`: `Double.equals`, which compares `doubleToLongBits`. */
function doubleEquals(a: number, b: number): boolean {
  return doubleToLongBits(a) === doubleToLongBits(b);
}

/**
 * Class resembles basic functionality of `java.awt.geom.Rectangle2D`. This way it is possible to avoid awt
 * dependencies in ELK Layered's code.
 *
 * The constructors `ElkRectangle()`, `ElkRectangle(x, y, w, h)` and `ElkRectangle(ElkRectangle)` are one
 * overloaded constructor.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/math/ElkRectangle.java
 */
export class ElkRectangle {
  /** The X coordinate of this `Rectangle`. */
  x: number;

  /** The Y coordinate of this `Rectangle`. */
  y: number;

  /** The width of this `Rectangle`. */
  width: number;

  /** The height of this `Rectangle`. */
  height: number;

  /** Constructs a new `Rectangle`, initialized to location (0, 0) and size (0, 0). */
  constructor();
  /** Constructs and initializes a `Rectangle` from the specified `double` coordinates. */
  constructor(x: number, y: number, w: number, h: number);
  /** Constructs and initializes a `Rectangle` from the specified instance. */
  constructor(rect: ElkRectangle);
  constructor(...args: [] | [number, number, number, number] | [ElkRectangle]) {
    if (args.length === 0) {
      this.x = 0;
      this.y = 0;
      this.width = 0;
      this.height = 0;
    } else if (args.length === 1) {
      const rect = args[0];
      this.x = rect.x;
      this.y = rect.y;
      this.width = rect.width;
      this.height = rect.height;
    } else {
      [this.x, this.y, this.width, this.height] = args;
    }
  }

  /** Sets the location and size of this `Rectangle` to the specified `double` values. */
  setRect(nx: number, ny: number, nw: number, nh: number): void {
    this.x = nx;
    this.y = ny;
    this.width = nw;
    this.height = nh;
  }

  /** @returns the (x,y) position of this rectangle. */
  getPosition(): KVector {
    return new KVector(this.x, this.y);
  }

  /** @returns the top left coordinate (x,y). */
  getTopLeft(): KVector {
    return this.getPosition();
  }

  /** @returns the top right coordinate (x+w,y). */
  getTopRight(): KVector {
    return new KVector(this.x + this.width, this.y);
  }

  /** @returns the bottom left coordinate (x,y+h). */
  getBottomLeft(): KVector {
    return new KVector(this.x, this.y + this.height);
  }

  /** @returns the bottom right coordinate (x+w,y+h). */
  getBottomRight(): KVector {
    return new KVector(this.x + this.width, this.y + this.height);
  }

  /** @returns the center point of a rectangle. */
  getCenter(): KVector {
    return new KVector(this.x + this.width / 2, this.y + this.height / 2);
  }

  /** Unions the receiver and the given `Rectangle` objects and puts the result into the receiver. */
  union(other: ElkRectangle): void {
    let x1 = Math.min(this.x, other.x);
    let y1 = Math.min(this.y, other.y);
    let x2 = Math.max(this.x + this.width, other.x + other.width);
    let y2 = Math.max(this.y + this.height, other.y + other.height);
    if (x2 < x1) {
      const t = x1;
      x1 = x2;
      x2 = t;
    }
    if (y2 < y1) {
      const t = y1;
      y1 = y2;
      y2 = t;
    }
    this.setRect(x1, y1, x2 - x1, y2 - y1);
  }

  /** Moves the rectangle by the given offset. */
  move(offset: KVector): void {
    this.x += offset.x;
    this.y += offset.y;
  }

  toString(): string {
    return `Rect[x=${doubleToString(this.x)},y=${doubleToString(this.y)},w=${doubleToString(this.width)},h=${doubleToString(this.height)}]`;
  }

  equals(obj: unknown): boolean {
    if (obj === null || !(obj instanceof ElkRectangle)) {
      return false;
    }
    return (
      doubleEquals(this.x, obj.x) &&
      doubleEquals(this.y, obj.y) &&
      doubleEquals(this.width, obj.width) &&
      doubleEquals(this.height, obj.height)
    );
  }

  /** `Objects.hash(x, y, width, height)`: `Arrays.hashCode` over the boxed doubles. */
  hashCode(): number {
    let result = 1;
    for (const value of [this.x, this.y, this.width, this.height]) {
      result = int32Add(int32Mul(HASH_MULTIPLIER, result), doubleHashCode(value));
    }
    return result;
  }

  /** Returns the largest X coordinate of the rectangle in double precision. */
  getMaxX(): number {
    return this.x + this.width;
  }

  /** Returns the largest Y coordinate of the rectangle in double precision. */
  getMaxY(): number {
    return this.y + this.height;
  }

  /** Tests if the interior of this rect intersects the interior of a specified rect. */
  intersects(rect: ElkRectangle): boolean {
    const r1x1 = this.x;
    const r1y1 = this.y;
    const r1x2 = this.x + this.width;
    const r1y2 = this.y + this.height;
    const r2x1 = rect.x;
    const r2y1 = rect.y;
    const r2x2 = rect.x + rect.width;
    const r2y2 = rect.y + rect.height;

    return r1x1 < r2x2 && r1x2 > r2x1 && r1y2 > r2y1 && r1y1 < r2y2;
  }
}
