// SPDX-License-Identifier: EPL-2.0
import { PortSide } from '../../../../../core/options/PortSide.js';
import { SizeOptions } from '../../../../../core/options/SizeOptions.js';
import type { NodeContext } from '../NodeContext.js';

/**
 * Knows how to properly size and position outer node label containers and to place node and port labels.
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/nodespacing/internal/algorithm/LabelPlacer.java
 */
export class LabelPlacer {
  /**
   * No instance required.
   */
  private constructor() {}

  /**
   * Places outer node label containers as well as all labels. ALL OF THEM!!!
   *
   * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/nodespacing/internal/algorithm/LabelPlacer.java
   */
  static placeLabels(nodeContext: NodeContext): void {
    // Properly place all label cells for outer node labels
    LabelPlacer.placeOuterNodeLabelContainers(nodeContext);

    // Tell all node label cells to place their labels
    for (const labelCell of nodeContext.nodeLabelCells.values()) {
      labelCell.applyLabelLayout();
    }

    // Tell all port label cells to place their labels
    for (const portContext of nodeContext.portContexts.values()) {
      if (portContext.portLabelCell !== null) {
        portContext.portLabelCell.applyLabelLayout();
      }
    }
  }

  /**
   * Places the outer node label containers according to size constraints and the current node size.
   */
  private static placeOuterNodeLabelContainers(nodeContext: NodeContext): void {
    const outerNodeLabelsOverhang = nodeContext.sizeOptions.contains(SizeOptions.OUTSIDE_NODE_LABELS_OVERHANG);

    LabelPlacer.placeHorizontalOuterNodeLabelContainer(nodeContext, outerNodeLabelsOverhang, PortSide.NORTH);
    LabelPlacer.placeHorizontalOuterNodeLabelContainer(nodeContext, outerNodeLabelsOverhang, PortSide.SOUTH);
    LabelPlacer.placeVerticalOuterNodeLabelContainer(nodeContext, outerNodeLabelsOverhang, PortSide.EAST);
    LabelPlacer.placeVerticalOuterNodeLabelContainer(nodeContext, outerNodeLabelsOverhang, PortSide.WEST);
  }

  /**
   * Places a horizontal outer node label container on the given side.
   */
  private static placeHorizontalOuterNodeLabelContainer(
    nodeContext: NodeContext,
    outerNodeLabelsOverhang: boolean,
    portSide: PortSide,
  ): void {
    const nodeSize = nodeContext.nodeSize;
    const nodeLabelContainer = nodeContext.outsideNodeLabelContainers.get(portSide)!;
    const nodeLabelContainerRect = nodeLabelContainer.getCellRectangle();

    // Set the container's width and height to its minimum width and height
    nodeLabelContainerRect.width = nodeLabelContainer.getMinimumWidth();
    nodeLabelContainerRect.height = nodeLabelContainer.getMinimumHeight();

    // The container must be at least as wide as the node is
    nodeLabelContainerRect.width = Math.max(nodeLabelContainerRect.width, nodeSize.x);

    // If node labels are not allowed to overhang and if they would do so right now, make the container smaller
    if (nodeLabelContainerRect.width > nodeSize.x && !outerNodeLabelsOverhang) {
      nodeLabelContainerRect.width = nodeSize.x;
    }

    // Container's x coordinate
    nodeLabelContainerRect.x = -(nodeLabelContainerRect.width - nodeSize.x) / 2;

    // Container's y coordinate depends on whether we place the thing on the northern or southern side
    switch (portSide) {
      case PortSide.NORTH:
        nodeLabelContainerRect.y = -nodeLabelContainerRect.height;
        break;

      case PortSide.SOUTH:
        nodeLabelContainerRect.y = nodeSize.y;
        break;
    }

    // Layout the container's children
    nodeLabelContainer.layoutChildrenHorizontally();
    nodeLabelContainer.layoutChildrenVertically();
  }

  /**
   * Places a vertical outer node label container on the given side.
   */
  private static placeVerticalOuterNodeLabelContainer(
    nodeContext: NodeContext,
    outerNodeLabelsOverhang: boolean,
    portSide: PortSide,
  ): void {
    const nodeSize = nodeContext.nodeSize;
    const nodeLabelContainer = nodeContext.outsideNodeLabelContainers.get(portSide)!;
    const nodeLabelContainerRect = nodeLabelContainer.getCellRectangle();

    // Set the container's width and height to its minimum width and height
    nodeLabelContainerRect.width = nodeLabelContainer.getMinimumWidth();
    nodeLabelContainerRect.height = nodeLabelContainer.getMinimumHeight();

    // The container must be at least as high as the node is
    nodeLabelContainerRect.height = Math.max(nodeLabelContainerRect.height, nodeSize.y);

    // If node labels are not allowed to overhang and if they would do so right now, make the container smaller
    if (nodeLabelContainerRect.height > nodeSize.y && !outerNodeLabelsOverhang) {
      nodeLabelContainerRect.height = nodeSize.y;
    }

    // Container's y coordinate
    nodeLabelContainerRect.y = -(nodeLabelContainerRect.height - nodeSize.y) / 2;

    // Container's x coordinate depends on whether we place the thing on the eastern or western side
    switch (portSide) {
      case PortSide.WEST:
        nodeLabelContainerRect.x = -nodeLabelContainerRect.width;
        break;

      case PortSide.EAST:
        nodeLabelContainerRect.x = nodeSize.x;
        break;
    }

    // Layout the container's children
    nodeLabelContainer.layoutChildrenHorizontally();
    nodeLabelContainer.layoutChildrenVertically();
  }
}
