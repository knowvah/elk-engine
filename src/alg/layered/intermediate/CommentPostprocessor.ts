// SPDX-License-Identifier: EPL-2.0
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import type { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import type { LPort } from '../graph/LPort.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { Spacings } from '../options/Spacings.js';

/**
 * Post-processor for comment boxes. If any comments are found that were removed by the `CommentPreprocessor`, they are
 * reinserted and placed above or below their corresponding connected node. Slot: after phase 5.
 *
 * The private two-list overload of the Java `process` is `processNode` (overloading); its top and bottom passes are
 * `placeTopBoxes` and `placeBottomBoxes` (complexity limits), in the Java order.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/CommentPostprocessor.java
 */
export class CommentPostprocessor implements ILayoutProcessor<LGraph> {
  /** @see CommentPostprocessor.java:54 */
  process(layeredGraph: LGraph, monitor: IElkProgressMonitor): void {
    monitor.begin('Comment post-processing', 1);

    for (const layer of layeredGraph) {
      const boxes: LNode[] = [];
      for (const node of layer) {
        const topBoxes = node.getProperty(InternalProperties.TOP_COMMENTS) as LNode[] | null;
        const bottomBoxes = node.getProperty(InternalProperties.BOTTOM_COMMENTS) as LNode[] | null;

        if (topBoxes !== null || bottomBoxes !== null) {
          this.processNode(node, topBoxes, bottomBoxes);

          if (topBoxes !== null) {
            boxes.push(...topBoxes);
          }

          if (bottomBoxes !== null) {
            boxes.push(...bottomBoxes);
          }
        }
      }

      layer.getNodes().push(...boxes);
    }

    monitor.done();
  }

  /**
   * Process a node with its connected comment boxes.
   *
   * @param node a normal node
   * @param topBoxes a list of boxes to be placed on top, or `null`
   * @param bottomBoxes a list of boxes to be placed in the bottom, or `null`
   * @see CommentPostprocessor.java:89
   */
  private processNode(node: LNode, topBoxes: readonly LNode[] | null, bottomBoxes: readonly LNode[] | null): void {
    const commentCommentSpacing = Spacings.getIndividualOrDefault(node, LayeredOptions.SPACING_COMMENT_COMMENT);

    if (topBoxes !== null) {
      CommentPostprocessor.placeTopBoxes(node, topBoxes, commentCommentSpacing);
    }

    if (bottomBoxes !== null) {
      CommentPostprocessor.placeBottomBoxes(node, bottomBoxes, commentCommentSpacing);
    }
  }

  /** The `topBoxes != null` pass (CommentPostprocessor.java:99-130). */
  private static placeTopBoxes(node: LNode, topBoxes: readonly LNode[], commentCommentSpacing: number): void {
    const nodePos = node.getPosition();
    const nodeSize = node.getSize();
    const margin = node.getMargin();

    // determine the total width and maximal height of the top boxes
    let boxesWidth = commentCommentSpacing * (topBoxes.length - 1);
    let maxHeight = 0;
    for (const box of topBoxes) {
      boxesWidth += box.getSize().x;
      maxHeight = Math.max(maxHeight, box.getSize().y);
    }

    // place the boxes on top of the node, horizontally centered around the node itself
    let x = nodePos.x - (boxesWidth - nodeSize.x) / 2;
    const baseLine = nodePos.y - margin.top + maxHeight;
    const anchorInc = nodeSize.x / (topBoxes.length + 1);
    let anchorX = anchorInc;
    for (const box of topBoxes) {
      box.getPosition().x = x;
      box.getPosition().y = baseLine - box.getSize().y;
      x += box.getSize().x + commentCommentSpacing;
      // set source and target point for the connecting edge
      const boxPort = CommentPostprocessor.getBoxPort(box)!;
      boxPort.getPosition().x = box.getSize().x / 2 - boxPort.getAnchor().x;
      boxPort.getPosition().y = box.getSize().y;
      const nodePort = box.getProperty(InternalProperties.COMMENT_CONN_PORT);
      if (nodePort.getDegree() === 1) {
        nodePort.getPosition().x = anchorX - nodePort.getAnchor().x;
        nodePort.getPosition().y = 0;
        nodePort.setNode(node);
      }
      anchorX += anchorInc;
    }
  }

  /** The `bottomBoxes != null` pass (CommentPostprocessor.java:132-166). */
  private static placeBottomBoxes(node: LNode, bottomBoxes: readonly LNode[], commentCommentSpacing: number): void {
    const nodePos = node.getPosition();
    const nodeSize = node.getSize();
    const margin = node.getMargin();

    // determine the total width and maximal height of the bottom boxes
    let boxesWidth = commentCommentSpacing * (bottomBoxes.length - 1);
    let maxHeight = 0;
    for (const box of bottomBoxes) {
      boxesWidth += box.getSize().x;
      maxHeight = Math.max(maxHeight, box.getSize().y);
    }

    // place the boxes in the bottom of the node, horizontally centered around the node itself
    let x = nodePos.x - (boxesWidth - nodeSize.x) / 2;
    const baseLine = nodePos.y + nodeSize.y + margin.bottom - maxHeight;
    const anchorInc = nodeSize.x / (bottomBoxes.length + 1);
    let anchorX = anchorInc;
    for (const box of bottomBoxes) {
      box.getPosition().x = x;
      box.getPosition().y = baseLine;
      x += box.getSize().x + commentCommentSpacing;
      // set source and target point for the connecting edge
      const boxPort = CommentPostprocessor.getBoxPort(box)!;
      boxPort.getPosition().x = box.getSize().x / 2 - boxPort.getAnchor().x;
      boxPort.getPosition().y = 0;
      const nodePort = box.getProperty(InternalProperties.COMMENT_CONN_PORT);
      if (nodePort.getDegree() === 1) {
        nodePort.getPosition().x = anchorX - nodePort.getAnchor().x;
        nodePort.getPosition().y = nodeSize.y;
        nodePort.setNode(node);
      }
      anchorX += anchorInc;
    }
  }

  /**
   * Retrieve the port of the given comment box that connects it with the corresponding node. The box is expected to have
   * exactly one connection, which is checked by the `CommentPreprocessor`.
   *
   * @param commentBox a comment box
   * @return the port that connects the box
   * @see CommentPostprocessor.java:169
   */
  private static getBoxPort(commentBox: LNode): LPort | null {
    const nodePort = commentBox.getProperty(InternalProperties.COMMENT_CONN_PORT);
    for (const port of commentBox.getPorts()) {
      // each Java loop returns on its first element, so only that element is visited
      const outgoing = port.getOutgoingEdges()[0];
      if (outgoing !== undefined) {
        // reconnect the edge (has been disconnected by pre-processor)
        outgoing.setTarget(nodePort);
        return port;
      }
      const incoming = port.getIncomingEdges()[0];
      if (incoming !== undefined) {
        // reconnect the edge (has been disconnected by pre-processor)
        incoming.setSource(nodePort);
        return port;
      }
    }
    return null;
  }
}
