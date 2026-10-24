// SPDX-License-Identifier: EPL-2.0

/**
 * The subset of `java.awt.geom.Rectangle2D` used by `org.eclipse.elk.core.comments`: the `OUT_*` bitmasks, `outcode`,
 * `intersects` and `isEmpty`, plus the nested `Rectangle2D.Double`. Written from the Javadoc only (AD-9) and proven
 * against the JVM vectors in `test/golden/refs/java/awt.json`.
 *
 * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.desktop/java/awt/geom/Rectangle2D.html
 */
export abstract class Rectangle2D {
  /**
   * The bitmask that indicates that a point lies to the left of this Rectangle2D.
   *
   * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.desktop/java/awt/geom/Rectangle2D.html#OUT_LEFT
   */
  public static readonly OUT_LEFT = 1;
  /**
   * The bitmask that indicates that a point lies above this Rectangle2D.
   *
   * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.desktop/java/awt/geom/Rectangle2D.html#OUT_TOP
   */
  public static readonly OUT_TOP = 2;
  /**
   * The bitmask that indicates that a point lies to the right of this Rectangle2D.
   *
   * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.desktop/java/awt/geom/Rectangle2D.html#OUT_RIGHT
   */
  public static readonly OUT_RIGHT = 4;
  /**
   * The bitmask that indicates that a point lies below this Rectangle2D.
   *
   * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.desktop/java/awt/geom/Rectangle2D.html#OUT_BOTTOM
   */
  public static readonly OUT_BOTTOM = 8;

  /** Returns the X coordinate of the upper-left corner of the framing rectangle. */
  public abstract getX(): number;
  /** Returns the Y coordinate of the upper-left corner of the framing rectangle. */
  public abstract getY(): number;
  /** Returns the width of the framing rectangle. */
  public abstract getWidth(): number;
  /** Returns the height of the framing rectangle. */
  public abstract getHeight(): number;

  /**
   * Determines whether the rectangle is empty, i.e. encloses no area.
   *
   * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.desktop/java/awt/geom/Rectangle2D.html#isEmpty()
   */
  public abstract isEmpty(): boolean;

  /**
   * Determines where the specified coordinates lie with respect to this Rectangle2D: the logical OR of the `OUT_*`
   * masks of every side of which the point is on the far side.
   *
   * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.desktop/java/awt/geom/Rectangle2D.html#outcode(double,double)
   */
  public abstract outcode(x: number, y: number): number;

  /**
   * Tests if the interior of this Rectangle2D intersects the interior of the specified rectangular area (or of the
   * specified Rectangle2D when called with one argument).
   *
   * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.desktop/java/awt/geom/RectangularShape.html
   */
  public intersects(r: Rectangle2D): boolean;
  public intersects(x: number, y: number, w: number, h: number): boolean;
  public intersects(xOrRect: number | Rectangle2D, y?: number, w?: number, h?: number): boolean {
    if (typeof xOrRect === 'number') {
      return this.intersectsArea(xOrRect, y as number, w as number, h as number);
    }
    return this.intersectsArea(xOrRect.getX(), xOrRect.getY(), xOrRect.getWidth(), xOrRect.getHeight());
  }

  private intersectsArea(x: number, y: number, w: number, h: number): boolean {
    if (this.isEmpty() || w <= 0 || h <= 0) {
      return false;
    }
    const x0 = this.getX();
    const y0 = this.getY();
    return x + w > x0 && y + h > y0 && x < x0 + this.getWidth() && y < y0 + this.getHeight();
  }
}

/** `java.awt.geom.Rectangle2D.Double`: a rectangle with `double` coordinates and mutable public fields. */
export namespace Rectangle2D {
  /**
   * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.desktop/java/awt/geom/Rectangle2D.Double.html
   */
  export class Double extends Rectangle2D {
    public x: number;
    public y: number;
    public width: number;
    public height: number;

    public constructor(x = 0, y = 0, w = 0, h = 0) {
      super();
      this.x = x;
      this.y = y;
      this.width = w;
      this.height = h;
    }

    public getX(): number {
      return this.x;
    }

    public getY(): number {
      return this.y;
    }

    public getWidth(): number {
      return this.width;
    }

    public getHeight(): number {
      return this.height;
    }

    public isEmpty(): boolean {
      return this.width <= 0 || this.height <= 0;
    }

    public outcode(x: number, y: number): number {
      let out = 0;
      if (this.width <= 0) {
        out |= Rectangle2D.OUT_LEFT | Rectangle2D.OUT_RIGHT;
      } else if (x < this.x) {
        out |= Rectangle2D.OUT_LEFT;
      } else if (x > this.x + this.width) {
        out |= Rectangle2D.OUT_RIGHT;
      }
      if (this.height <= 0) {
        out |= Rectangle2D.OUT_TOP | Rectangle2D.OUT_BOTTOM;
      } else if (y < this.y) {
        out |= Rectangle2D.OUT_TOP;
      } else if (y > this.y + this.height) {
        out |= Rectangle2D.OUT_BOTTOM;
      }
      return out;
    }
  }
}
