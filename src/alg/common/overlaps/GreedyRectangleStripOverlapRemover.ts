// SPDX-License-Identifier: EPL-2.0
import { compare } from '../../../java/lang/DoubleCompare.js';
import type { IRectangleStripOverlapRemovalStrategy } from './IRectangleStripOverlapRemovalStrategy.js';
import type { RectangleStripOverlapRemover } from './RectangleStripOverlapRemover.js';
import type { RectangleNode } from './RectangleStripOverlapRemoverRectangleNode.js';

/**
 * Removes rectangle overlaps by greedily choosing the smallest y position that won't cause overlaps. Fast algorithm,
 * but not necessarily optimal in terms of resulting rectangle strip size.
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/overlaps/GreedyRectangleStripOverlapRemover.java
 */
export class GreedyRectangleStripOverlapRemover implements IRectangleStripOverlapRemovalStrategy {
  removeOverlaps(overlapRemover: RectangleStripOverlapRemover): number {
    const verticalGap = overlapRemover.getVerticalGap();
    // AD-10 (identity-hashed Sets.newHashSet, :33): Set in insertion order; only add/contains are used, so
    // iteration order is not observable.
    const alreadyPlacedNodes = new Set<RectangleNode>();
    let stripSize = 0;

    for (const currNode of overlapRemover.getRectangleNodes()) {
      // We start with an initial y coordinate of zero
      let yPos = 0;

      // Sort the node's list of overlapping nodes by y coordinate
      currNode.getOverlappingNodes().sort(GreedyRectangleStripOverlapRemover.compareByYCoordinate);

      // We now iterate over every conflicting rectangle node that we have already placed to see if the current
      // coordinate would cause an overlap
      for (const overlapNode of currNode.getOverlappingNodes()) {
        if (alreadyPlacedNodes.has(overlapNode)) {
          const currRect = currNode.getRectangle();
          const overlapRect = overlapNode.getRectangle();

          // Check if the current y coordinate would cause an overlap with the overlap node
          if (
            yPos < overlapRect.y + overlapRect.height + verticalGap &&
            yPos + currRect.height + verticalGap > overlapRect.y
          ) {
            yPos = overlapRect.y + overlapRect.height + verticalGap;
          }
        }
      }

      // Apply the y coordinate and remember that this node is now placed
      currNode.getRectangle().y = yPos;
      alreadyPlacedNodes.add(currNode);

      // Update the strip size
      stripSize = Math.max(stripSize, currNode.getRectangle().y + currNode.getRectangle().height);
    }

    return stripSize;
  }

  /**
   * Compares two rectangle nodes by the y coordinates of their rectangles.
   *
   * @param node1 first node.
   * @param node2 second node.
   */
  static compareByYCoordinate(node1: RectangleNode, node2: RectangleNode): number {
    return compare(node1.getRectangle().y, node2.getRectangle().y);
  }
}
