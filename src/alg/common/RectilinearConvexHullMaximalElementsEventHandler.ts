// SPDX-License-Identifier: EPL-2.0
import * as Lists from '../../guava/Lists.js';
import { compare as doubleCompare } from '../../java/lang/DoubleCompare.js';
import type { EventHandler } from './compaction/ScanlineEventHandler.js';
import { Point } from './Point.js';
import { Quadrant } from './PointQuadrant.js';

/**
 * An {@link EventHandler} that can be passed to the {@link Scanline} algorithm to
 * determine the rectilinear convex hull (Java private static nested class
 * `RectilinearConvexHull.MaximalElementsEventHandler`).
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/RectilinearConvexHull.java
 */
export class RectilinearConvexHullMaximalElementsEventHandler implements EventHandler<Point> {
  private static readonly DBL_CMP = (d1: number, d2: number): number => doubleCompare(d1, d2);

  private readonly quadrant: Quadrant;
  /** The points this handler determined after the execution of the scanline. */
  points: Point[] = Lists.newArrayList<Point>();
  private maximalY = 0;
  private compare: (a: number, b: number) => number = RectilinearConvexHullMaximalElementsEventHandler.DBL_CMP;

  /**
   * The handler finds one of the four staircases of the rectilinear convex hull, depending on
   * the specified quadrant. Note however that for this handler to work properly the
   * {@link Scanline} must run left-to-right for quadrants Q1 and Q4 and right-to-left for
   * quadrants Q2 and Q3.
   * See the specially defined comparators (such as `RectilinearConvexHull.LEFT_HIGH_FIRST`) for more details.
   *
   * @param quadrant the {@link Quadrant} for which this handler finds points on the hull.
   */
  constructor(quadrant: Quadrant) {
    this.quadrant = quadrant;

    switch (quadrant) {
      case Quadrant.Q1:
      case Quadrant.Q2:
        // Collections.reverseOrder(DBL_CMP)
        this.compare = (a, b) => RectilinearConvexHullMaximalElementsEventHandler.DBL_CMP(b, a);
        this.maximalY = Number.POSITIVE_INFINITY;
        break;
      case Quadrant.Q3:
      case Quadrant.Q4:
        this.compare = RectilinearConvexHullMaximalElementsEventHandler.DBL_CMP;
        this.maximalY = Number.NEGATIVE_INFINITY;
        break;
    }
  }

  handle(p: Point): void {
    if (this.compare(p.y, this.maximalY) > 0) {
      this.points.push(new Point(p.x, p.y, this.quadrant));
      this.maximalY = p.y;
    }
  }
}
