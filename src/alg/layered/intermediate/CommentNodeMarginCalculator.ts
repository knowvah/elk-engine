// SPDX-License-Identifier: EPL-2.0
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import type { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { Spacings } from '../options/Spacings.js';

/** The summed width and the largest height of a list of comment boxes laid next to each other. */
interface BoxExtent {
  width: number;
  maxHeight: number;
}

/**
 * Computes and sets the node margins required to place comment boxes. Slot: before phase 4.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/CommentNodeMarginCalculator.java
 */
export class CommentNodeMarginCalculator implements ILayoutProcessor<LGraph> {
  /** @see CommentNodeMarginCalculator.java:48 */
  process(layeredGraph: LGraph, monitor: IElkProgressMonitor): void {
    monitor.begin('Node margin calculation', 1);

    // Iterate through the layers to additionally handle comments
    for (const layer of layeredGraph.getLayers()) {
      for (const lnode of layer.getNodes()) {
        this.processComments(lnode);
      }
    }

    monitor.done();
  }

  /**
   * Make some extra space for comment boxes that are placed near the given node.
   *
   * @see CommentNodeMarginCalculator.java:62
   */
  processComments(node: LNode): void {
    const margin = node.getMargin();

    const topBoxes = node.getProperty(InternalProperties.TOP_COMMENTS) as LNode[] | null;
    const bottomBoxes = node.getProperty(InternalProperties.BOTTOM_COMMENTS) as LNode[] | null;

    if (topBoxes === null && bottomBoxes === null) {
      // Shortcut if there are no attached comments
      return;
    }

    // Retrieve the spacings that apply to this node
    const commentCommentSpacing = Spacings.getIndividualOrDefault(node, LayeredOptions.SPACING_COMMENT_COMMENT);
    const commentNodeSpacing = Spacings.getIndividualOrDefault(node, LayeredOptions.SPACING_COMMENT_NODE);

    // Consider comment boxes that are put on top of the node
    let topWidth = 0;
    if (topBoxes !== null) {
      const extent = CommentNodeMarginCalculator.extentOf(topBoxes);
      topWidth = extent.width + commentCommentSpacing * (topBoxes.length - 1);
      margin.top += extent.maxHeight + commentNodeSpacing;
    }

    // Consider comment boxes that are put in the bottom of the node
    let bottomWidth = 0;
    if (bottomBoxes !== null) {
      const extent = CommentNodeMarginCalculator.extentOf(bottomBoxes);
      bottomWidth = extent.width + commentCommentSpacing * (bottomBoxes.length - 1);
      margin.bottom += extent.maxHeight + commentNodeSpacing;
    }

    // Check if the maximum width of the comments is wider than the node itself, which the comments
    // are centered on
    const maxCommentWidth = Math.max(topWidth, bottomWidth);
    if (maxCommentWidth > node.getSize().x) {
      const protrusion = (maxCommentWidth - node.getSize().x) / 2;
      margin.left = Math.max(margin.left, protrusion);
      margin.right = Math.max(margin.right, protrusion);
    }
  }

  /** The two accumulation loops of `processComments` (:79-83, :91-95); the spacing term is added by the caller. */
  private static extentOf(boxes: readonly LNode[]): BoxExtent {
    const extent: BoxExtent = { width: 0, maxHeight: 0 };
    for (const commentBox of boxes) {
      extent.maxHeight = Math.max(extent.maxHeight, commentBox.getSize().y);
      extent.width += commentBox.getSize().x;
    }
    return extent;
  }
}
