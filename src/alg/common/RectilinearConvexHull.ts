// SPDX-License-Identifier: EPL-2.0
import type { ElkRectangle } from '../../core/math/ElkRectangle.js';
import * as Lists from '../../guava/Lists.js';
import { compare as doubleCompare } from '../../java/lang/DoubleCompare.js';
import { IllegalStateException } from '../../java/lang/IllegalStateException.js';
import { ArrayListIterator } from '../../java/util/ListIterator.js';
import { Scanline } from './compaction/Scanline.js';
import { Point } from './Point.js';
import { Quadrant } from './PointQuadrant.js';
import { RectilinearConvexHullMaximalElementsEventHandler as MaximalElementsEventHandler } from './RectilinearConvexHullMaximalElementsEventHandler.js';
import {
  quadrantOf,
  RectilinearConvexHullRectangleEventHandler as RectangleEventHandler,
} from './RectilinearConvexHullRectangleEventHandler.js';

/** Java `Integer.compare` for the ordinals compared by {@link RIGHT_SPECIAL_ORDER}. */
const integerCompare = (a: number, b: number): number => (a < b ? -1 : a === b ? 0 : 1);

const RIGHT_HIGH_FIRST = (p1: Point, p2: Point): number => {
  if (p1.x === p2.x) {
    return doubleCompare(p2.y, p1.y);
  } else {
    return doubleCompare(p1.x, p2.x);
  }
};

const RIGHT_LOW_FIRST = (p1: Point, p2: Point): number => {
  if (p1.x === p2.x) {
    return doubleCompare(p1.y, p2.y);
  } else {
    return doubleCompare(p1.x, p2.x);
  }
};

const LEFT_HIGH_FIRST = (p1: Point, p2: Point): number => {
  if (p1.x === p2.x) {
    return doubleCompare(p2.y, p1.y);
  } else {
    return doubleCompare(p2.x, p1.x);
  }
};

const LEFT_LOW_FIRST = (p1: Point, p2: Point): number => {
  if (p1.x === p2.x) {
    return doubleCompare(p1.y, p2.y);
  } else {
    return doubleCompare(p2.x, p1.x);
  }
};

/*-----------------------------------------------------------------------------------------
 *                                Splitting into rectangles
 *-----------------------------------------------------------------------------------------*/

/**
 * If the x coordinates are the same, Q1,Q4 < Q2,Q3, for Q1,Q2 convex smaller than concave.
 */
const RIGHT_SPECIAL_ORDER = (p1: Point, p2: Point): number => {
  if (p1.x === p2.x) {
    const q1 = quadrantOf(p1);
    const q2 = quadrantOf(p2);

    // same quadrant or both either left or right
    if (q1 === q2 || Quadrant.isBothLeftOrBothRight(q1, q2)) {
      // for left quadrants concave before convex,
      // for right quadrants convex before concave
      const val = q1.isLeft() ? 1 : -1;
      if (p1.convex && !p2.convex) {
        return val;
      } else if (!p1.convex && p2.convex) {
        return -val;
      }
    }

    return integerCompare(q1.ordinal(), q2.ordinal());
  } else {
    return doubleCompare(p1.x, p2.x);
  }
};

/**
 * The rectilinear convex hull is represented by four staircases.
 *
 * ```
 *   q1 | q2
 *  ---------
 *   q4 | q3
 * ```
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/RectilinearConvexHull.java
 */
export class RectilinearConvexHull {
  /** This hull's determined points. */
  private readonly hull: Point[] = Lists.newArrayList<Point>();

  // Java suppresses "unused" for xMax1, xMax2, yMax1, yMax2, yMin1 and yMin2: they are only ever assigned.
  private xMax1: Point | null = null;
  private xMax2: Point | null = null;
  private xMin1: Point | null = null;
  private xMin2: Point | null = null;
  private yMax1: Point | null = null;
  private yMax2: Point | null = null;
  private yMin1: Point | null = null;
  private yMin2: Point | null = null;

  private static readonly DEBUG = false;

  private constructor() {}

  /**
   * @param points a cloud of points for which the rectilinear convex hull should be determined.
   * @returns The {@link RectilinearConvexHull} for the passed points.
   */
  static of(points: Iterable<Point>): RectilinearConvexHull {
    const rch = new RectilinearConvexHull();

    for (const p of points) {
      rch.trackExtremalPoints(p);
    }

    // q1 | q2
    // ---------
    // q4 | q3

    // Q1
    const q1 = new MaximalElementsEventHandler(Quadrant.Q1);
    Scanline.execute(points, RIGHT_LOW_FIRST, q1);

    // Q4
    const q4 = new MaximalElementsEventHandler(Quadrant.Q4);
    Scanline.execute(points, RIGHT_HIGH_FIRST, q4);

    // Q2
    const q2 = new MaximalElementsEventHandler(Quadrant.Q2);
    Scanline.execute(points, LEFT_LOW_FIRST, q2);

    // Q3
    const q3 = new MaximalElementsEventHandler(Quadrant.Q3);
    Scanline.execute(points, LEFT_HIGH_FIRST, q3);

    if (RectilinearConvexHull.DEBUG) {
      RectilinearConvexHull.printStairs('no concaves', q1, q2, q3, q4);
    }

    // the scanline algorithm detected all convex corners,
    // now we add the concave corners to the lists
    RectilinearConvexHull.addConcaveCorners(q1.points, Quadrant.Q1);
    RectilinearConvexHull.addConcaveCorners(q2.points, Quadrant.Q2);
    RectilinearConvexHull.addConcaveCorners(q3.points, Quadrant.Q3);
    RectilinearConvexHull.addConcaveCorners(q4.points, Quadrant.Q4);

    // print clockwise
    if (RectilinearConvexHull.DEBUG) {
      RectilinearConvexHull.printStairs('with concaves', q1, q2, q3, q4);
    }

    // ... and add everything to the hull list
    // (in clockwise order, q1..q4)
    rch.getHull().length = 0;
    rch.getHull().push(...q1.points);
    rch.getHull().push(...Lists.reverse(q2.points));
    rch.getHull().push(...q3.points);
    rch.getHull().push(...Lists.reverse(q4.points));

    return rch;
  }

  /** The `if (DEBUG)` blocks of `of`: prints the four stairs clockwise (extracted for the complexity limit). */
  private static printStairs(
    title: string,
    q1: MaximalElementsEventHandler,
    q2: MaximalElementsEventHandler,
    q3: MaximalElementsEventHandler,
    q4: MaximalElementsEventHandler,
  ): void {
    // print clockwise
    console.log(`The four stairs (${title}):`);
    console.log(q1.points);
    console.log([...Lists.reverse(q2.points)]);
    console.log(q3.points);
    console.log([...Lists.reverse(q4.points)]);
  }

  /** The body of the first `for` loop of `of`: tracks the two most extremal points per direction. */
  private trackExtremalPoints(p: Point): void {
    // equality important since the two extremal points can be equal
    if (this.xMax1 === null || p.x >= this.xMax1.x) {
      this.xMax2 = this.xMax1;
      this.xMax1 = p;
    }
    if (this.xMin1 === null || p.x <= this.xMin1.x) {
      this.xMin2 = this.xMin1;
      this.xMin1 = p;
    }
    if (this.yMax1 === null || p.y >= this.yMax1.y) {
      this.yMax2 = this.yMax1;
      this.yMax1 = p;
    }
    if (this.yMin1 === null || p.y <= this.yMin1.y) {
      this.yMin2 = this.yMin1;
      this.yMin1 = p;
    }
  }

  /**
   * @returns the points uniquely specifying the rectilinear convex hull. The points are ordered
   *         clock-wise starting with the Q1 staircase (Q1, Q2, Q3, Q4).
   */
  getHull(): Point[] {
    return this.hull;
  }

  /**
   * @returns the rectilinear convex hull represented by a set of non-overlapping {@link ElkRectangle}s.
   *         The rectangles are determined using a scanline from left-to-right creating a new
   *         rectangle each time a "vertical" segment is detected in the rectilinear convex hull.
   */
  splitIntoRectangles(): ElkRectangle[] {
    const handler = new RectangleEventHandler(this.initialLastX());
    Scanline.execute(this.hull, RIGHT_SPECIAL_ORDER, handler);

    // append the lastly queued rectangle
    if (handler.queued !== null) {
      handler.rects.push(handler.queued);
    }

    return handler.rects;
  }

  /** `Math.min(xMin1.x, xMin2.x)`, the initial `lastX` of the Java inner `RectangleEventHandler`. */
  private initialLastX(): number {
    if (this.xMin1 === null || this.xMin2 === null) {
      // Java: NullPointerException when dereferencing the missing extremal point
      throw new IllegalStateException('The hull needs at least two points to be split into rectangles');
    }
    return Math.min(this.xMin1.x, this.xMin2.x);
  }

  /**
   * @param pts a list of points representing convex points of one staircase of the rectilinear
   *            convex hull.
   * @param q the {@link Quadrant} for which the points were determined.
   */
  private static addConcaveCorners(pts: Point[], q: Quadrant): void {
    const pIt = new ArrayListIterator<Point>(pts);
    let last = pIt.next();
    while (pIt.hasNext()) {
      const next = pIt.next();
      const p = new Point(next.x, last.y, q);
      pIt.previous();
      pIt.add(p);
      pIt.next();
      p.convex = false;
      last = next;
    }
  }
}
