// SPDX-License-Identifier: EPL-2.0
import { CoreOptions } from '../../../../../core/options/CoreOptions.js';
import { PortConstraints } from '../../../../../core/options/PortConstraints.js';
import { PortSide } from '../../../../../core/options/PortSide.js';
import { SizeConstraint } from '../../../../../core/options/SizeConstraint.js';
import { SizeOptions } from '../../../../../core/options/SizeOptions.js';
import type { NodeContext } from '../NodeContext.js';
import { NodeLabelAndSizeUtilities } from './NodeLabelAndSizeUtilities.js';

/**
 * Configures the cell system according to the node size constraints and determines the ultimate node size.
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/nodespacing/internal/algorithm/NodeSizeCalculator.java
 */
export class NodeSizeCalculator {
  /**
   * No instance required.
   */
  private constructor() {}

  // ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Node Width

  /**
   * Sets the node's width according to the active node size constraints. Also sets that width on the cell system and
   * tells it to compute a horizontal layout.
   *
   * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/nodespacing/internal/algorithm/NodeSizeCalculator.java
   */
  static setNodeWidth(nodeContext: NodeContext): void {
    const nodeSize = nodeContext.nodeSize;
    let width: number;

    if (NodeLabelAndSizeUtilities.areSizeConstraintsFixed(nodeContext)) {
      // Simply use the node's current width
      width = nodeSize.x;
    } else {
      width = NodeSizeCalculator.computeFreeWidth(nodeContext);
    }

    // Set the node's width
    if (nodeContext.node.getGraph()!.getProperty(CoreOptions.NODE_SIZE_FIXED_GRAPH_SIZE)) {
      nodeSize.x = Math.max(nodeSize.x, width);
    } else {
      nodeSize.x = width;
    }

    // Set the cell system's width and tell it to compute horizontal coordinates and widths
    const nodeCellRectangle = nodeContext.nodeContainer.getCellRectangle();
    nodeCellRectangle.x = 0;
    nodeCellRectangle.width = width;

    nodeContext.nodeContainer.layoutChildrenHorizontally();
  }

  /**
   * The `else` branch of `setNodeWidth` (the non-fixed size constraints), split out to respect the function size
   * limit.
   */
  private static computeFreeWidth(nodeContext: NodeContext): number {
    const nodeSize = nodeContext.nodeSize;
    let width: number;

    // Ask the cell system how wide it would like to be or take the node's width if it has already been set to a
    // greater value
    if (nodeContext.topdownLayout) {
      width = Math.max(nodeSize.x, nodeContext.nodeContainer.getMinimumWidth());
    } else {
      width = nodeContext.nodeContainer.getMinimumWidth();
    }

    // If we include node labels and outside node labels are not to overhang, we need to include those as well
    if (
      nodeContext.sizeConstraints.contains(SizeConstraint.NODE_LABELS) &&
      !nodeContext.sizeOptions.contains(SizeOptions.OUTSIDE_NODE_LABELS_OVERHANG)
    ) {
      width = Math.max(width, nodeContext.outsideNodeLabelContainers.get(PortSide.NORTH)!.getMinimumWidth());
      width = Math.max(width, nodeContext.outsideNodeLabelContainers.get(PortSide.SOUTH)!.getMinimumWidth());
    }

    // The node might have a minimum size set...
    const minNodeSize = NodeLabelAndSizeUtilities.getMinimumNodeSize(nodeContext);
    if (minNodeSize !== null) {
      width = Math.max(width, minNodeSize.x);
    }

    return width;
  }

  // ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Node Height

  /**
   * Sets the node's height according to the active node size constraints. Also sets that height on the cell system
   * and tells it to compute a horizontal layout.
   *
   * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/nodespacing/internal/algorithm/NodeSizeCalculator.java
   */
  static setNodeHeight(nodeContext: NodeContext): void {
    const nodeSize = nodeContext.nodeSize;
    let height: number;

    if (NodeLabelAndSizeUtilities.areSizeConstraintsFixed(nodeContext)) {
      // Simply use the node's current height
      height = nodeSize.y;
    } else {
      height = NodeSizeCalculator.computeFreeHeight(nodeContext);
    }

    // Set the node's height
    if (nodeContext.node.getGraph()!.getProperty(CoreOptions.NODE_SIZE_FIXED_GRAPH_SIZE)) {
      nodeSize.y = Math.max(nodeSize.y, height);
    } else {
      nodeSize.y = height;
    }

    // Set the cell system's height and tell it to compute vertical coordinates and heights
    const nodeCellRectangle = nodeContext.nodeContainer.getCellRectangle();
    nodeCellRectangle.y = 0;
    nodeCellRectangle.height = height;

    nodeContext.nodeContainer.layoutChildrenVertically();
  }

  /**
   * The `else` branch of `setNodeHeight` (the non-fixed size constraints), split out to respect the function size
   * limit.
   */
  private static computeFreeHeight(nodeContext: NodeContext): number {
    const nodeSize = nodeContext.nodeSize;
    let height: number;

    // Ask the cell system how high it would like to be or take the node's height if it has already been set to
    // a greater value
    if (nodeContext.topdownLayout) {
      height = Math.max(nodeSize.y, nodeContext.nodeContainer.getMinimumHeight());
    } else {
      height = nodeContext.nodeContainer.getMinimumHeight();
    }

    // If we include node labels and outside node labels are not to overhang, we need to include those as well
    if (
      nodeContext.sizeConstraints.contains(SizeConstraint.NODE_LABELS) &&
      !nodeContext.sizeOptions.contains(SizeOptions.OUTSIDE_NODE_LABELS_OVERHANG)
    ) {
      height = Math.max(height, nodeContext.outsideNodeLabelContainers.get(PortSide.EAST)!.getMinimumHeight());
      height = Math.max(height, nodeContext.outsideNodeLabelContainers.get(PortSide.WEST)!.getMinimumHeight());
    }

    // The node might have a minimum size set...
    const minNodeSize = NodeLabelAndSizeUtilities.getMinimumNodeSize(nodeContext);
    if (minNodeSize !== null) {
      height = Math.max(height, minNodeSize.y);
    }

    // If size constraints are set to include ports, but port constraints are FIXED_POS or FIXED_RATIO, we need
    // to manually apply the height required to place eastern and western ports because those heights don't
    // come out of the cell system
    if (nodeContext.sizeConstraints.contains(SizeConstraint.PORTS)) {
      if (
        nodeContext.portConstraints === PortConstraints.FIXED_RATIO ||
        nodeContext.portConstraints === PortConstraints.FIXED_POS
      ) {
        height = Math.max(height, nodeContext.insidePortLabelCells.get(PortSide.EAST)!.getMinimumHeight());
        height = Math.max(height, nodeContext.insidePortLabelCells.get(PortSide.WEST)!.getMinimumHeight());
      }
    }

    return height;
  }
}
