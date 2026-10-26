// SPDX-License-Identifier: EPL-2.0
import { ElkRectangle } from '../../core/math/ElkRectangle.js';
import * as Lists from '../../guava/Lists.js';
import { IllegalStateException } from '../../java/lang/IllegalStateException.js';
import type { EventHandler } from './compaction/ScanlineEventHandler.js';
import type { Point } from './Point.js';
import { Quadrant } from './PointQuadrant.js';

/**
 * The quadrant of a point of a hull (`null` only for points that were never assigned one; Java would throw a
 * `NullPointerException` when dereferencing it).
 *
 * @param p a point of a hull
 * @returns the point's quadrant
 */
export function quadrantOf(p: Point): Quadrant {
  if (p.quadrant === null) {
    throw new IllegalStateException('The point has no quadrant');
  }
  return p.quadrant;
}

/**
 * A handler for the {@link Scanline} that detects vertical segments in the rectilinear convex
 * hull and uses them to create rectangles (Java private inner class
 * `RectilinearConvexHull.RectangleEventHandler`).
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/RectilinearConvexHull.java
 */
export class RectilinearConvexHullRectangleEventHandler implements EventHandler<Point> {
  rects: ElkRectangle[] = Lists.newArrayList<ElkRectangle>();

  private minY: Point | null = null;
  private maxY: Point | null = null;

  private lastX: number;

  queued: ElkRectangle | null = null;
  private queuedPnt: Point | null = null;

  /**
   * Java initializes `lastX = Math.min(xMin1.x, xMin2.x)` from the enclosing hull's fields; the inner class
   * becomes a standalone class that takes the value.
   *
   * @param lastX `Math.min(xMin1.x, xMin2.x)` of the enclosing hull
   */
  constructor(lastX: number) {
    this.lastX = lastX;
  }

  handle(p: Point): void {
    if (
      this.queued !== null &&
      this.queuedPnt !== null &&
      (p.x !== this.queuedPnt.x || Quadrant.isOneLeftOneRight(quadrantOf(this.queuedPnt), quadrantOf(p)))
    ) {
      this.rects.push(this.queued);
      this.lastX = this.queued.x + this.queued.width;
      this.queued = null;
      this.queuedPnt = null;
    }

    if (quadrantOf(p).isUpper()) {
      this.minY = p;
    } else {
      this.maxY = p;
    }

    if (RectilinearConvexHullRectangleEventHandler.isQueueingPoint(p)) {
      // queue a possible rect
      if (this.minY !== null && this.maxY !== null) {
        // FIXME else?
        const r = new ElkRectangle(this.lastX, this.minY.y, p.x - this.lastX, this.maxY.y - this.minY.y);
        this.queued = r;
        this.queuedPnt = p;
      }
    }
  }

  /** The condition of the Java `if` before `// queue a possible rect`, extracted for the complexity limit. */
  private static isQueueingPoint(p: Point): boolean {
    const q = quadrantOf(p);
    return (
      (q === Quadrant.Q1 && !p.convex) ||
      (q === Quadrant.Q2 && p.convex) ||
      (q === Quadrant.Q3 && p.convex) ||
      (q === Quadrant.Q4 && !p.convex)
    );
  }
}
