// SPDX-License-Identifier: EPL-2.0
import type { ElkRectangle } from '../../../core/math/ElkRectangle.js';
import * as Lists from '../../../guava/Lists.js';
import { TEdge } from '../TEdge.js';

/**
 * Utility methods for the common algorithms.
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/utils/Utils.java
 */
export class Utils {
  private constructor() {}

  /**
   * Computes the overlap of two rectangles, scaled by their center distance (1 when they do not overlap).
   *
   * @param r1 first rectangle
   * @param r2 second rectangle
   * @returns the scale factor by which the centers' distance must grow to remove the overlap
   */
  static overlap(r1: ElkRectangle, r2: ElkRectangle): number {
    const horizontalOverlap = Math.min(Math.abs(r1.x - (r2.x + r2.width)), Math.abs(r1.x + r1.width - r2.x));
    const verticalOverlap = Math.min(Math.abs(r1.y - (r2.y + r2.height)), Math.abs(r1.y + r1.height - r2.y));
    const horizontalCenterDistance = Math.abs(r1.x + r1.width / 2.0 - (r2.x + r2.width / 2.0));
    if (horizontalCenterDistance > r1.width / 2.0 + r2.width / 2.0) {
      return 1.0;
    }
    const verticalCenterDistance = Math.abs(r1.y + r1.height / 2.0 - (r2.y + r2.height / 2.0));
    if (verticalCenterDistance > r1.height / 2.0 + r2.height / 2.0) {
      return 1.0;
    }
    if (horizontalCenterDistance === 0.0 && verticalCenterDistance === 0.0) {
      return 0;
    }
    if (horizontalCenterDistance === 0.0) {
      return verticalOverlap / verticalCenterDistance + 1;
    }
    if (verticalCenterDistance === 0.0) {
      return horizontalOverlap / horizontalCenterDistance + 1;
    }
    return Math.min(horizontalOverlap / horizontalCenterDistance, verticalOverlap / verticalCenterDistance) + 1;
  }

  /**
   * Returns the four edges of a rectangle.
   *
   * @param r the rectangle
   * @returns top, left, right and bottom edge, in that order
   */
  static getRectEdges(r: ElkRectangle): TEdge[] {
    const rectEdegs: TEdge[] = Lists.newArrayList<TEdge>();
    rectEdegs.push(new TEdge(r.getTopLeft(), r.getTopRight()));
    rectEdegs.push(new TEdge(r.getTopLeft(), r.getBottomLeft()));
    rectEdegs.push(new TEdge(r.getBottomRight(), r.getTopRight()));
    rectEdegs.push(new TEdge(r.getBottomRight(), r.getBottomLeft()));
    return rectEdegs;
  }
}
