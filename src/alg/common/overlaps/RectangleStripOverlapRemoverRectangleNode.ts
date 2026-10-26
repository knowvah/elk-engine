// SPDX-License-Identifier: EPL-2.0
import type { ElkRectangle } from '../../../core/math/ElkRectangle.js';

/**
 * A node in the rectangle overlap graph. Java's public nested class `RectangleStripOverlapRemover.RectangleNode`,
 * split into its own file (M15).
 *
 * The Java constructor and the two rectangle fields are private and used by the enclosing class; TypeScript has no
 * nested-class access to outer privates, so they are public here and only `RectangleStripOverlapRemover` uses them.
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/overlaps/RectangleStripOverlapRemover.java
 */
export class RectangleNode {
  /** The original rectangle represented by this node. */
  originalRectangle: ElkRectangle;
  /**
   * The rectangle represented by this node after the coordinate transformation. If no coordinate transformation was
   * necessary, this may well be the same rectangle as {@link originalRectangle}.
   */
  rectangle: ElkRectangle;
  /** List of nodes that this node overlaps with. (`Lists.newLinkedList()` in Java: only appended to and sorted.) */
  overlappingNodes: RectangleNode[] = [];

  /**
   * Creates a new instance holding the given data.
   *
   * @param originalRectangle the original rectangle represented by this node.
   * @param rectangle the rectangle transformed into our standard coordinate space.
   */
  constructor(originalRectangle: ElkRectangle, rectangle: ElkRectangle) {
    this.originalRectangle = originalRectangle;
    this.rectangle = rectangle;
  }

  /** Returns this node's rectangle. */
  getRectangle(): ElkRectangle {
    return this.rectangle;
  }

  /** Returns the nodes whose rectangles overlap with this node's rectangle. */
  getOverlappingNodes(): RectangleNode[] {
    return this.overlappingNodes;
  }
}
