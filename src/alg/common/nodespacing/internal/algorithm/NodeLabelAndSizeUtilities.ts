// SPDX-License-Identifier: EPL-2.0
import { ElkPadding } from '../../../../../core/math/ElkPadding.js';
import { KVector } from '../../../../../core/math/KVector.js';
import { CoreOptions } from '../../../../../core/options/CoreOptions.js';
import { PortLabelPlacement } from '../../../../../core/options/PortLabelPlacement.js';
import { PortSide } from '../../../../../core/options/PortSide.js';
import { SizeConstraint } from '../../../../../core/options/SizeConstraint.js';
import { SizeOptions } from '../../../../../core/options/SizeOptions.js';
import { DEFAULT_MIN_HEIGHT, DEFAULT_MIN_WIDTH, computeInsidePart } from '../../../../../core/util/ElkUtil.js';
import { EnumSet } from '../../../../../java/util/EnumSet.js';
import type { NodeContext } from '../NodeContext.js';
import type { PortContext } from '../PortContext.js';

/**
 * Various little methods that didn't quite fit into any of the other classes.
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/nodespacing/internal/algorithm/NodeLabelAndSizeUtilities.java
 */
export class NodeLabelAndSizeUtilities {
  /** Size constraints that only contain port labels should not cause a node to resize. */
  private static readonly EFFECTIVELY_FIXED_SIZE_CONSTRAINTS: EnumSet<SizeConstraint> = EnumSet.of(
    SizeConstraint.PORT_LABELS,
  );

  /**
   * No instance required.
   */
  private constructor() {}

  // ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Algorithm Phase Implementation Fragments

  /**
   * If the client area should have a minimum size, the inside node label container is setup accordingly. This does
   * not yet set any size contribution constraints, but only applies the minimum size itself.
   */
  static setupMinimumClientAreaSize(nodeContext: NodeContext): void {
    const minSize = NodeLabelAndSizeUtilities.getMinimumClientAreaSize(nodeContext);
    if (minSize !== null) {
      nodeContext.insideNodeLabelContainer.setCenterCellMinimumSize(minSize);
    }
  }

  /**
   * Sets up the padding of the main node cell to account for ports that extend inside the node.
   */
  static setupNodePaddingForPortsWithOffset(nodeContext: NodeContext): void {
    const nodeCellPadding = nodeContext.nodeContainer.getPadding();

    for (const portContext of nodeContext.portContexts.values()) {
      // If the port extends into the node, ensure the inside port space is enough
      let portBorderOffset = 0;
      if (portContext.port.hasProperty(CoreOptions.PORT_BORDER_OFFSET)) {
        portBorderOffset = portContext.port.getProperty(CoreOptions.PORT_BORDER_OFFSET);

        if (portBorderOffset < 0) {
          // The port does extend into the node, by -portBorderOffset
          NodeLabelAndSizeUtilities.padForPortExtendingIntoNode(nodeCellPadding, portContext, portBorderOffset);
        }
      }
      if (PortLabelPlacement.isFixed(nodeContext.portLabelsPlacement)) {
        // Ensure that the part of the fixed label, that is inside the node, has enough space.
        NodeLabelAndSizeUtilities.padForFixedPortLabels(nodeContext, nodeCellPadding, portContext, portBorderOffset);
      }
    }
  }

  /**
   * The `switch` of {@link setupNodePaddingForPortsWithOffset} that widens the padding on the port's side by
   * `-portBorderOffset` (split out for the complexity limits).
   */
  private static padForPortExtendingIntoNode(
    nodeCellPadding: ElkPadding,
    portContext: PortContext,
    portBorderOffset: number,
  ): void {
    switch (portContext.port.getSide()) {
      case PortSide.NORTH:
        nodeCellPadding.top = Math.max(nodeCellPadding.top, -portBorderOffset);
        break;

      case PortSide.SOUTH:
        nodeCellPadding.bottom = Math.max(nodeCellPadding.bottom, -portBorderOffset);
        break;

      case PortSide.EAST:
        nodeCellPadding.right = Math.max(nodeCellPadding.right, -portBorderOffset);
        break;

      case PortSide.WEST:
        nodeCellPadding.left = Math.max(nodeCellPadding.left, -portBorderOffset);
        break;
    }
  }

  /**
   * The fixed-port-labels block of {@link setupNodePaddingForPortsWithOffset} (split out for the complexity limits).
   */
  private static padForFixedPortLabels(
    nodeContext: NodeContext,
    nodeCellPadding: ElkPadding,
    portContext: PortContext,
    portBorderOffset: number,
  ): void {
    const insidePart = computeInsidePart(portContext.port, portBorderOffset);
    const symmetry = !nodeContext.node.getProperty(CoreOptions.NODE_SIZE_OPTIONS).contains(SizeOptions.ASYMMETRICAL);
    switch (portContext.port.getSide()) {
      case PortSide.NORTH:
        NodeLabelAndSizeUtilities.padNorthForFixedLabel(nodeCellPadding, insidePart, symmetry, portBorderOffset);
        break;

      case PortSide.SOUTH:
        NodeLabelAndSizeUtilities.padSouthForFixedLabel(nodeCellPadding, insidePart, symmetry, portBorderOffset);
        break;

      case PortSide.EAST:
        NodeLabelAndSizeUtilities.padEastForFixedLabel(nodeCellPadding, insidePart, symmetry, portBorderOffset);
        break;

      case PortSide.WEST:
        NodeLabelAndSizeUtilities.padWestForFixedLabel(nodeCellPadding, insidePart, symmetry, portBorderOffset);
        break;
    }
  }

  /** The `NORTH` arm of the fixed-port-labels `switch`. */
  private static padNorthForFixedLabel(
    nodeCellPadding: ElkPadding,
    insidePart: number,
    symmetry: boolean,
    portBorderOffset: number,
  ): void {
    const insidePartIsBigger = insidePart > nodeCellPadding.top;
    nodeCellPadding.top = Math.max(nodeCellPadding.top, insidePart);
    if (symmetry && insidePartIsBigger) {
      nodeCellPadding.top = Math.max(nodeCellPadding.top, nodeCellPadding.bottom);
      // For symmetry, the portBorderOffset is not considered (only label + label padding)
      nodeCellPadding.bottom = nodeCellPadding.top + portBorderOffset;
    }
  }

  /** The `SOUTH` arm of the fixed-port-labels `switch`. */
  private static padSouthForFixedLabel(
    nodeCellPadding: ElkPadding,
    insidePart: number,
    symmetry: boolean,
    portBorderOffset: number,
  ): void {
    const insidePartIsBigger = insidePart > nodeCellPadding.bottom;
    nodeCellPadding.bottom = Math.max(nodeCellPadding.bottom, insidePart);
    if (symmetry && insidePartIsBigger) {
      nodeCellPadding.bottom = Math.max(nodeCellPadding.bottom, nodeCellPadding.top);
      // For symmetry, the portBorderOffset is not considered (only label + label padding)
      nodeCellPadding.top = nodeCellPadding.bottom + portBorderOffset;
    }
  }

  /** The `EAST` arm of the fixed-port-labels `switch`. */
  private static padEastForFixedLabel(
    nodeCellPadding: ElkPadding,
    insidePart: number,
    symmetry: boolean,
    portBorderOffset: number,
  ): void {
    const insidePartIsBigger = insidePart > nodeCellPadding.right;
    nodeCellPadding.right = Math.max(nodeCellPadding.right, insidePart);
    if (symmetry && insidePartIsBigger) {
      nodeCellPadding.right = Math.max(nodeCellPadding.left, nodeCellPadding.right);
      // For symmetry, the portBorderOffset is not considered (only label + label padding)
      nodeCellPadding.left = nodeCellPadding.right + portBorderOffset;
    }
  }

  /** The `WEST` arm of the fixed-port-labels `switch`. */
  private static padWestForFixedLabel(
    nodeCellPadding: ElkPadding,
    insidePart: number,
    symmetry: boolean,
    portBorderOffset: number,
  ): void {
    const insidePartIsBigger = insidePart > nodeCellPadding.left;
    nodeCellPadding.left = Math.max(nodeCellPadding.left, insidePart);
    if (symmetry && insidePartIsBigger) {
      nodeCellPadding.left = Math.max(nodeCellPadding.left, nodeCellPadding.right);
      // For symmetry, the portBorderOffset is not considered (only label + label padding)
      nodeCellPadding.right = nodeCellPadding.left + portBorderOffset;
    }
  }

  /**
   * Offsets all southern ports, previously placed relative to vertical coordinate 0, by the node's size to place
   * them along the node's southern border.
   */
  static offsetSouthernPortsByNodeSize(nodeContext: NodeContext): void {
    const nodeHeight = nodeContext.nodeSize.y;

    for (const portContext of nodeContext.portContexts.get(PortSide.SOUTH)) {
      const portPosition = portContext.portPosition;
      portPosition.y += nodeHeight;
    }
  }

  /**
   * Calculates and stores the node padding, if requested by layout options.
   */
  static setNodePadding(nodeContext: NodeContext): void {
    if (!nodeContext.sizeOptions.contains(SizeOptions.COMPUTE_PADDING)) {
      return;
    }

    const nodeRect = nodeContext.nodeContainer.getCellRectangle();
    const clientArea = nodeContext.insideNodeLabelContainer.getCenterCellRectangle();
    const nodePadding = new ElkPadding();

    // The following code assumes that the client area rectangle lies fully inside the node rectangle, which should
    // always be the case because of how the client area rectangle is computed
    nodePadding.left = clientArea.x - nodeRect.x;
    nodePadding.top = clientArea.y - nodeRect.y;
    nodePadding.right = nodeRect.x + nodeRect.width - (clientArea.x + clientArea.width);
    nodePadding.bottom = nodeRect.y + nodeRect.height - (clientArea.y + clientArea.height);

    nodeContext.node.setPadding(nodePadding);
  }

  /**
   * Applies the calculated node size to the node and the calculated port positions to the ports.
   */
  static applyStuff(nodeContext: NodeContext): void {
    nodeContext.applyNodeSize();
    for (const portContext of nodeContext.portContexts.values()) {
      portContext.applyPortPosition();
    }
  }

  // ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Minimum Size Things

  /**
   * Returns the client area's minimum size if size constraints are configured such that the client area has a
   * minimum size. Otherwise, returns `null`.
   */
  static getMinimumClientAreaSize(nodeContext: NodeContext): KVector | null {
    if (
      nodeContext.sizeConstraints.contains(SizeConstraint.MINIMUM_SIZE) &&
      nodeContext.sizeOptions.contains(SizeOptions.MINIMUM_SIZE_ACCOUNTS_FOR_PADDING)
    ) {
      return NodeLabelAndSizeUtilities.getMinimumNodeOrClientAreaSize(nodeContext);
    } else {
      return null;
    }
  }

  /**
   * Returns the node's minimum size if size constraints are configured such that the node as a whole has a minimum
   * size. Otherwise, returns `null`.
   */
  static getMinimumNodeSize(nodeContext: NodeContext): KVector | null {
    if (nodeContext.sizeConstraints.contains(SizeConstraint.MINIMUM_SIZE)) {
      if (!nodeContext.sizeOptions.contains(SizeOptions.MINIMUM_SIZE_ACCOUNTS_FOR_PADDING)) {
        return NodeLabelAndSizeUtilities.getMinimumNodeOrClientAreaSize(nodeContext);
      }
    }

    return null;
  }

  /**
   * Returns the minimum size configured for the node, without regard for size constraints.
   */
  static getMinimumNodeOrClientAreaSize(nodeContext: NodeContext): KVector {
    // Retrieve the minimum size
    const minSize = new KVector(nodeContext.node.getProperty(CoreOptions.NODE_SIZE_MINIMUM));

    // If we are instructed to revert to a default minimum size, we check whether we need to revert to that
    if (nodeContext.sizeOptions.contains(SizeOptions.DEFAULT_MINIMUM_SIZE)) {
      if (minSize.x <= 0) {
        minSize.x = DEFAULT_MIN_WIDTH;
      }

      if (minSize.y <= 0) {
        minSize.y = DEFAULT_MIN_HEIGHT;
      }
    }

    return minSize;
  }

  // ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Utilities

  /**
   * Checks if the size constraints, even if not empty, should cause the node not to be resized. This is the case if
   * the constraints are either empty or contain only {@link SizeConstraint.PORT_LABELS}.
   */
  static areSizeConstraintsFixed(nodeContext: NodeContext): boolean {
    return (
      nodeContext.sizeConstraints.isEmpty() ||
      nodeContext.sizeConstraints.equals(NodeLabelAndSizeUtilities.EFFECTIVELY_FIXED_SIZE_CONSTRAINTS)
    );
  }

  /**
   * Outside ports usually have their labels placed below or to the right. The first port, however, may have its label
   * placed on the other side. This is true if several conditions apply:
   * - The port does **not** want its label to be placed next to it (see
   *   {@link PortLabelPlacement.NEXT_TO_PORT_IF_POSSIBLE}).
   * - {@link PortLabelPlacement.ALWAYS_SAME_SIDE} is **not** set.
   * - There are only two ports or space-efficient port label placement is turned on (see
   *   {@link PortLabelPlacement.SPACE_EFFICIENT}).
   */
  static isFirstOutsidePortLabelPlacedDifferently(nodeContext: NodeContext, portSide: PortSide): boolean {
    const portContexts = nodeContext.portContexts.get(portSide);
    if (portContexts.size >= 2) {
      const firstPort = portContexts[Symbol.iterator]().next().value as PortContext;

      const alwaysSameSide = nodeContext.portLabelsPlacement.contains(PortLabelPlacement.ALWAYS_SAME_SIDE);
      const spaceEfficient = nodeContext.portLabelsPlacement.contains(PortLabelPlacement.SPACE_EFFICIENT);

      return !firstPort.labelsNextToPort && !alwaysSameSide && (portContexts.size === 2 || spaceEfficient);
    } else {
      return false;
    }
  }
}
