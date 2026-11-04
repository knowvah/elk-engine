// SPDX-License-Identifier: EPL-2.0
import { ElkMargin } from '../../../../core/math/ElkMargin.js';
import { KVector } from '../../../../core/math/KVector.js';
import { PortSide } from '../../../../core/options/PortSide.js';
import * as Iterables from '../../../../guava/Iterables.js';
import { IllegalArgumentException } from '../../../../java/lang/IllegalArgumentException.js';
import { LShape } from '../../graph/LShape.js';

/** The `DecimalFormat("#0.0")` of `toString` shows one fraction digit. */
const SCALE = 10;
/** A double that is an odd multiple of 1/4 is the only kind of exact tie at one fraction digit. */
const QUARTER = 4;
/** Values from here on have no fraction digits and `toFixed` switches to exponent notation. */
const EXPONENT_FROM = 1e21;

/**
 * `new DecimalFormat("#0.0").format(value)` (HALF_EVEN, the exact binary value, `-0.0` keeps its sign). Prose only: the
 * Java `DEC_FORMAT` (`Rectangle.java:322`) is not ported as a class (R6); `toFixed` rounds the exact value half up, so
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

/** The argument lists of the six Java constructors (the last two share one signature, see the class comment). */
type RectangleArgs =
  | [left: number, top: number, right: number, bottom: number]
  | [rectangle: Rectangle]
  | [position: KVector]
  | [shape: LShape]
  | [vectors: Iterable<KVector>]
  | KVector[];

function isCoordinates(args: RectangleArgs): args is [number, number, number, number] {
  return args.length === 4 && typeof args[0] === 'number';
}

function isIterable(value: unknown): value is Iterable<KVector> {
  return typeof value === 'object' && value !== null && Symbol.iterator in value;
}

/**
 * This class is representing a rectangle and provides some comfort methods to work with the rectangle. Special about
 * this implementation is that there is no width and height stored. This improves the performance of unions and accesses
 * to the right/top side.
 *
 * The six Java constructors are one overloaded constructor told apart by the argument types: four numbers
 * `(left, top, right, bottom)`, a `Rectangle` (copy), a `KVector`, an `LShape`, an `Iterable<KVector>` and the
 * `KVector...` varargs (two or more vectors, or none, which throws). `union` is one instance method over a `KVector`, an
 * `LShape` or a `Rectangle` and one static method over two rectangles or a collection (docs/translation-rules.md 6.5);
 * `union(LShape)` calls the `KVector` overload and the static pair form calls the instance `Rectangle` form: neither is
 * a recursion (R8).
 *
 * @author tit
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/splines/Rectangle.java
 */
export class Rectangle {
  // The rectangle is defined by the four outer coordinates.
  /** Minimum y-value. */
  private top = Number.MAX_VALUE;
  /** Maximum y-value. */
  private bottom = -Number.MAX_VALUE;
  /** Maximum x-value. */
  private left = Number.MAX_VALUE;
  /** Minimum x-value. */
  private right = -Number.MAX_VALUE;

  /**
   * Creates a new rectangle with the given values.
   *
   * @param left The minimum x-value of the rectangle.
   * @param top The maximum y-value of the rectangle.
   * @param right The maximum x-value of the rectangle.
   * @param bottom The minimum y-value of the rectangle.
   */
  constructor(left: number, top: number, right: number, bottom: number);
  /** A copy constructor. */
  constructor(rectangle: Rectangle);
  /** Creates a new Rectangle for the given KVector, resulting in a rectangle with height = width = 0. */
  constructor(position: KVector);
  /** Creates a rectangle around the given shape. */
  constructor(shape: LShape);
  /** Creates a rectangle around all given coordinates. */
  constructor(vectors: Iterable<KVector>);
  /** Creates a new rectangle including all coordinates of the given vectors. */
  constructor(...vectors: KVector[]);
  constructor(...args: RectangleArgs) {
    const only = args.length === 1 ? args[0] : undefined;
    if (isCoordinates(args)) {
      this.constructFromCoordinates(...args);
    } else if (only instanceof Rectangle) {
      this.constructFromRectangle(only);
    } else if (only instanceof KVector) {
      this.constructFromPosition(only);
    } else if (only instanceof LShape) {
      this.constructFromShape(only);
    } else if (isIterable(only)) {
      this.constructFromIterable(only);
    } else {
      this.constructFromVectors(args as KVector[]);
    }
  }

  /** `Rectangle(double, double, double, double)`, `Rectangle.java:56`. */
  private constructFromCoordinates(left: number, top: number, right: number, bottom: number): void {
    if (top > bottom) {
      throw new IllegalArgumentException('Top must be smaller or equal to bottom.');
    } else if (left > right) {
      throw new IllegalArgumentException('Left must be smaller or equal to right.');
    }
    this.top = top;
    this.right = right;
    this.bottom = bottom;
    this.left = left;
  }

  /** `Rectangle(Rectangle)`, `Rectangle.java:73`. */
  private constructFromRectangle(rectangle: Rectangle): void {
    this.top = rectangle.top;
    this.right = rectangle.right;
    this.bottom = rectangle.bottom;
    this.left = rectangle.left;
  }

  /** `Rectangle(KVector)`, `Rectangle.java:85`. */
  private constructFromPosition(position: KVector): void {
    this.top = position.y;
    this.bottom = position.y;
    this.right = position.x;
    this.left = position.x;
  }

  /** `Rectangle(LShape)`, `Rectangle.java:97`. */
  private constructFromShape(shape: LShape): void {
    const position = shape.getPosition();
    const extend = position.clone().add(shape.getSize());

    this.top = Math.min(position.y, extend.y);
    this.bottom = Math.max(position.y, extend.y);
    this.left = Math.min(position.x, extend.x);
    this.right = Math.max(position.x, extend.x);
  }

  /** `Rectangle(Iterable<KVector>)`, `Rectangle.java:112`. */
  private constructFromIterable(vectors: Iterable<KVector>): void {
    if (Iterables.isEmpty(vectors)) {
      throw new IllegalArgumentException('The list of vectors may not be empty.');
    }

    this.includeAll(vectors);
  }

  /** `Rectangle(KVector...)`, `Rectangle.java:130`. */
  private constructFromVectors(vectors: readonly KVector[]): void {
    if (vectors.length === 0) {
      throw new IllegalArgumentException('The list of vectors may not be empty.');
    }

    this.includeAll(vectors);
  }

  /** The loop both vector constructors share (`Rectangle.java:117-122` and `:135-140`, identical in the Java). */
  private includeAll(vectors: Iterable<KVector>): void {
    for (const vector of vectors) {
      this.top = Math.min(this.top, vector.y);
      this.right = Math.max(this.right, vector.x);
      this.bottom = Math.max(this.bottom, vector.y);
      this.left = Math.min(this.left, vector.x);
    }
  }

  /** Enlarges this rectangle to include the given coordinate, shape or rectangle. */
  union(vector: KVector): void;
  union(shape: LShape): void;
  union(rectangle: Rectangle): void;
  union(other: KVector | LShape | Rectangle): void {
    if (other instanceof KVector) {
      this.unionVector(other);
    } else if (other instanceof LShape) {
      this.unionShape(other);
    } else {
      this.unionRectangle(other);
    }
  }

  /** `union(KVector)`, `Rectangle.java:148`. */
  private unionVector(vector: KVector): void {
    this.top = Math.min(this.top, vector.y);
    this.right = Math.max(this.right, vector.x);
    this.bottom = Math.max(this.bottom, vector.y);
    this.left = Math.min(this.left, vector.x);
  }

  /** `union(LShape)`, `Rectangle.java:160`. */
  private unionShape(shape: LShape): void {
    this.union(shape.getPosition());
    this.union(shape.getPosition().clone().add(shape.getSize().x, shape.getSize().y));
  }

  /** `union(Rectangle)`, `Rectangle.java:170`. */
  private unionRectangle(rectangle: Rectangle): void {
    this.top = Math.min(this.top, rectangle.top);
    this.right = Math.max(this.right, rectangle.right);
    this.bottom = Math.max(this.bottom, rectangle.bottom);
    this.left = Math.min(this.left, rectangle.left);
  }

  /** Creates a new rectangle, spanning around the two given rectangles, or around the given rectangles. */
  static union(rectangle1: Rectangle, rectangle2: Rectangle): Rectangle;
  static union(rectangles: Iterable<Rectangle>): Rectangle;
  static union(...args: [Rectangle, Rectangle] | [Iterable<Rectangle>]): Rectangle {
    return args.length === 2 ? Rectangle.unionPair(args[0], args[1]) : Rectangle.unionCollection(args[0]);
  }

  /** `union(Rectangle, Rectangle)`, `Rectangle.java:184`. */
  private static unionPair(rectangle1: Rectangle, rectangle2: Rectangle): Rectangle {
    const retVal = new Rectangle(rectangle1);
    retVal.union(rectangle2);
    return retVal;
  }

  /**
   * `union(Collection<Rectangle>)`, `Rectangle.java:196`. Verbatim, including that the following rectangles are
   * unioned into the FIRST element of the collection (`rectangle`), not into the returned copy `retVal`.
   */
  private static unionCollection(rectangles: Iterable<Rectangle>): Rectangle {
    const iter = rectangles[Symbol.iterator]();
    let next = iter.next();
    if (next.done !== true) {
      const rectangle = next.value;
      const retVal = new Rectangle(rectangle);
      for (next = iter.next(); next.done !== true; next = iter.next()) {
        rectangle.union(next.value);
      }
      return retVal;
    } else {
      throw new IllegalArgumentException('The list of vectors may not be null.');
    }
  }

  /**
   * Enlarges this rectangle in all four directions by the given value.
   *
   * @param enlargement The value this rectangle will be enlarged in all four directions.
   */
  enlarge(enlargement: number): void {
    this.top = this.top - enlargement;
    this.left = this.left - enlargement;
    this.right = this.right + enlargement;
    this.bottom = this.bottom + enlargement;
  }

  /** Calculates and returns the height of this rectangle. */
  getHeight(): number {
    return this.bottom - this.top;
  }

  /** Calculates and returns the width of this rectangle. */
  getWidth(): number {
    return this.right - this.left;
  }

  /** Returns the top edge of this rectangle. */
  getTop(): number {
    return this.top;
  }

  /** Returns the right edge of this rectangle. */
  getRight(): number {
    return this.right;
  }

  /** Returns the bottom edge of this rectangle. */
  getBottom(): number {
    return this.bottom;
  }

  /** Returns the left edge of this rectangle. */
  getLeft(): number {
    return this.left;
  }

  /**
   * Returns the coordinate of the edge of this rectangle that is corresponding to the given {@link PortSide}.
   *
   * @param side The {@link PortSide} for which to return the edge of this rectangle.
   * @return The position of the specified edge.
   */
  getFromPortSide(side: PortSide): number {
    switch (side) {
      case PortSide.NORTH:
        return this.top;
      case PortSide.EAST:
        return this.right;
      case PortSide.SOUTH:
        return this.bottom;
      case PortSide.WEST:
        return this.left;
      default:
        return 0.0;
    }
  }

  /**
   * Creates a margin that is relative to a {@link LShape}, so that this {@link Rectangle} completely lays inside the
   * margins and is of minimal size. The margins of any side of the shape will be at least 0. If the given shape is a
   * `LNode` it's margin is neither modified nor taken into account.
   *
   * @param shape The shape the margins shall lay around.
   * @return A new margin laying around the shape.
   */
  toNodeMargins(shape: LShape): ElkMargin {
    const retVal = new ElkMargin();

    const shapeRectangle = new Rectangle(0, 0, shape.getSize().x, shape.getSize().y);
    retVal.top = Math.max(0.0, shapeRectangle.top - this.top);
    retVal.left = Math.max(0.0, shapeRectangle.left - this.left);
    retVal.bottom = Math.max(0.0, this.bottom - shapeRectangle.bottom);
    retVal.right = Math.max(0.0, this.right - shapeRectangle.right);

    return retVal;
  }

  /** Converts this rectangle to a readable string with rounded values (`DEC_FORMAT`, `Rectangle.java:322`). */
  toString(): string {
    return (
      '[' +
      `top= ${formatOneDecimal(this.top)}` +
      `,left= ${formatOneDecimal(this.left)}` +
      `,bottom= ${formatOneDecimal(this.bottom)}` +
      `,right= ${formatOneDecimal(this.right)}]`
    );
  }
}
