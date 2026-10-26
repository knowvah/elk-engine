// SPDX-License-Identifier: EPL-2.0
import type { RectangleStripOverlapRemover } from './RectangleStripOverlapRemover.js';

/**
 * Classes implementing this interface know how to remove overlaps between a strip of rectangles.
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/overlaps/IRectangleStripOverlapRemovalStrategy.java
 */
export interface IRectangleStripOverlapRemovalStrategy {
  /**
   * Removes overlaps for the given {@link RectangleStripOverlapRemover}.
   *
   * @param overlapRemover the overlap remover that invokes overlap removal.
   * @returns the height of the resulting strip of rectangles.
   */
  removeOverlaps(overlapRemover: RectangleStripOverlapRemover): number;
}
