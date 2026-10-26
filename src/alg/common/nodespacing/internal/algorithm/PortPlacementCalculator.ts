// SPDX-License-Identifier: EPL-2.0
import { KVector } from '../../../../../core/math/KVector.js';
import { CoreOptions } from '../../../../../core/options/CoreOptions.js';
import { PortAlignment } from '../../../../../core/options/PortAlignment.js';
import { PortConstraints } from '../../../../../core/options/PortConstraints.js';
import { PortSide } from '../../../../../core/options/PortSide.js';
import { SizeOptions } from '../../../../../core/options/SizeOptions.js';
import type { GraphAdapters } from '../../../../../core/util/adapters/GraphAdapters.js';
import type { IProperty } from '../../../../../graph/properties/IProperty.js';
import { Property } from '../../../../../graph/properties/Property.js';
import type { NodeContext } from '../NodeContext.js';
import type { PortContext } from '../PortContext.js';

/**
 * The state of a free port placement along one axis. Java keeps these as four locals of the placement method; they
 * are a record here only so that the method's sections can be separate methods (complexity limits).
 */
interface FreePlacement {
  portAlignment: PortAlignment;
  availableSpace: number;
  calculatedPortPlacementSize: number;
  currentPos: number;
  spaceBetweenPorts: number;
}

/**
 * Actually places ports.
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/nodespacing/internal/algorithm/PortPlacementCalculator.java
 */
export class PortPlacementCalculator {
  /**
   * Copy of the `InternalProperties.PORT_RATIO_OR_POSITION` option of the layered algorithm. For further information
   * see the documentation found there. We added this copy here to allow a generic treatment of spacing calculations
   * for graph elements. See the nodespacing package. [programmatically set]
   *
   * TODO This should be replaced by a proper property declared in a MELK file.
   *
   * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/nodespacing/internal/algorithm/PortPlacementCalculator.java:45
   */
  static readonly PORT_RATIO_OR_POSITION: IProperty<number> = new Property<number>('portRatioOrPosition', 0.0);

  /**
   * No instance required.
   */
  private constructor() {}

  // ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Horizontal Port Placement

  /**
   * Places horizontal ports.
   */
  static placeHorizontalPorts(nodeContext: NodeContext): void {
    // How we are going to place the ports depends on their constraints
    switch (nodeContext.portConstraints) {
      case PortConstraints.FIXED_POS:
        PortPlacementCalculator.placeHorizontalFixedPosPorts(nodeContext, PortSide.NORTH);
        PortPlacementCalculator.placeHorizontalFixedPosPorts(nodeContext, PortSide.SOUTH);
        break;

      case PortConstraints.FIXED_RATIO:
        PortPlacementCalculator.placeHorizontalFixedRatioPorts(nodeContext, PortSide.NORTH);
        PortPlacementCalculator.placeHorizontalFixedRatioPorts(nodeContext, PortSide.SOUTH);
        break;

      default:
        PortPlacementCalculator.placeHorizontalFreePorts(nodeContext, PortSide.NORTH);
        PortPlacementCalculator.placeHorizontalFreePorts(nodeContext, PortSide.SOUTH);
        break;
    }
  }

  /**
   * Places ports on the northern and southern side for the {@link PortConstraints.FIXED_POS} case.
   */
  private static placeHorizontalFixedPosPorts(nodeContext: NodeContext, portSide: PortSide): void {
    for (const portContext of nodeContext.portContexts.get(portSide)) {
      // The port's x coordinate is already fixed anyway, so simply adjust its y coordinate according to its
      // offset, if any
      portContext.portPosition.y = PortPlacementCalculator.calculateHorizontalPortYCoordinate(portContext);
    }
  }

  /**
   * Places ports on the northern and southern side for the {@link PortConstraints.FIXED_RATIO} case.
   */
  private static placeHorizontalFixedRatioPorts(nodeContext: NodeContext, portSide: PortSide): void {
    const nodeWidth = nodeContext.nodeSize.x;

    for (const portContext of nodeContext.portContexts.get(portSide)) {
      // The x coordinate is a function of the node's width and the port's position ratio
      portContext.portPosition.x =
        nodeWidth * portContext.port.getProperty(PortPlacementCalculator.PORT_RATIO_OR_POSITION);
      portContext.portPosition.y = PortPlacementCalculator.calculateHorizontalPortYCoordinate(portContext);
    }
  }

  /**
   * Places ports on the northern and southern side for the unconstrained cases.
   */
  private static placeHorizontalFreePorts(nodeContext: NodeContext, portSide: PortSide): void {
    // If there are no ports on the given side, abort
    if (nodeContext.portContexts.get(portSide).isEmpty()) {
      return;
    }

    // Retrieve the proper inside port label cell, which will give us hints as to where to place our ports
    const insidePortLabelCell = nodeContext.insidePortLabelCells.get(portSide)!;
    const insidePortLabelCellRectangle = insidePortLabelCell.getCellRectangle();
    const insidePortLabelCellPadding = insidePortLabelCell.getPadding();

    // Note that we don't have to distinguish any cases here because the port margins already include space
    // required for labels, if such space is to be reserved. Yay!
    const state: FreePlacement = {
      portAlignment: nodeContext.getPortAlignment(portSide),
      availableSpace:
        insidePortLabelCellRectangle.width - insidePortLabelCellPadding.left - insidePortLabelCellPadding.right,
      calculatedPortPlacementSize: insidePortLabelCell.getMinimumContentAreaSize().x,
      currentPos: insidePortLabelCellRectangle.x + insidePortLabelCellPadding.left,
      spaceBetweenPorts: nodeContext.portPortSpacing,
    };

    PortPlacementCalculator.centerSinglePort(nodeContext, portSide, state);
    PortPlacementCalculator.distributeAvailableSpace(nodeContext, portSide, state);

    // Iterate over all ports and place them
    for (const portContext of nodeContext.portContexts.get(portSide)) {
      portContext.portPosition.x = state.currentPos + portContext.portMargin.left;
      portContext.portPosition.y = PortPlacementCalculator.calculateHorizontalPortYCoordinate(portContext);

      // Update the x coordinate for the next port
      state.currentPos +=
        portContext.portMargin.left +
        portContext.port.getSize().x +
        portContext.portMargin.right +
        state.spaceBetweenPorts;
    }
  }

  /**
   * Returns the y coordinate for the given port.
   */
  private static calculateHorizontalPortYCoordinate(portContext: PortContext): number {
    const port: GraphAdapters.PortAdapter<unknown> = portContext.port;

    // The y coordinate is set according to the port's offset, if any
    if (port.hasProperty(CoreOptions.PORT_BORDER_OFFSET)) {
      return port.getSide() === PortSide.NORTH
        ? -port.getSize().y - port.getProperty(CoreOptions.PORT_BORDER_OFFSET)
        : port.getProperty(CoreOptions.PORT_BORDER_OFFSET);
    } else {
      return port.getSide() === PortSide.NORTH ? -port.getSize().y : 0;
    }
  }

  // ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Vertical Port Placement

  /**
   * Places vertical ports.
   */
  static placeVerticalPorts(nodeContext: NodeContext): void {
    // How we are going to place the ports depends on their constraints
    switch (nodeContext.portConstraints) {
      case PortConstraints.FIXED_POS:
        PortPlacementCalculator.placeVerticalFixedPosPorts(nodeContext, PortSide.EAST);
        PortPlacementCalculator.placeVerticalFixedPosPorts(nodeContext, PortSide.WEST);
        break;

      case PortConstraints.FIXED_RATIO:
        PortPlacementCalculator.placeVerticalFixedRatioPorts(nodeContext, PortSide.EAST);
        PortPlacementCalculator.placeVerticalFixedRatioPorts(nodeContext, PortSide.WEST);
        break;

      default:
        PortPlacementCalculator.placeVerticalFreePorts(nodeContext, PortSide.EAST);
        PortPlacementCalculator.placeVerticalFreePorts(nodeContext, PortSide.WEST);
        break;
    }
  }

  /**
   * Places ports on the eastern and western side for the {@link PortConstraints.FIXED_POS} case.
   */
  private static placeVerticalFixedPosPorts(nodeContext: NodeContext, portSide: PortSide): void {
    const nodeWidth = nodeContext.nodeSize.x;

    for (const portContext of nodeContext.portContexts.get(portSide)) {
      // The port's y coordinate is already fixed anyway, so simply adjust its x coordinate according to its
      // offset, if any
      portContext.portPosition.x = PortPlacementCalculator.calculateVerticalPortXCoordinate(portContext, nodeWidth);
    }
  }

  /**
   * Places ports on the eastern and western side for the {@link PortConstraints.FIXED_RATIO} case.
   */
  private static placeVerticalFixedRatioPorts(nodeContext: NodeContext, portSide: PortSide): void {
    const nodeSize: KVector = nodeContext.nodeSize;

    for (const portContext of nodeContext.portContexts.get(portSide)) {
      // The y coordinate is a function of the node's width and the port's position ratio
      portContext.portPosition.x = PortPlacementCalculator.calculateVerticalPortXCoordinate(portContext, nodeSize.x);
      portContext.portPosition.y =
        nodeSize.y * portContext.port.getProperty(PortPlacementCalculator.PORT_RATIO_OR_POSITION);
    }
  }

  /**
   * Places ports on the eastern and western side for the unconstrained cases.
   */
  private static placeVerticalFreePorts(nodeContext: NodeContext, portSide: PortSide): void {
    // If there are no ports on the given side, abort
    if (nodeContext.portContexts.get(portSide).isEmpty()) {
      return;
    }

    // Retrieve the proper inside port label cell, which will give us hints as to where to place our ports
    const insidePortLabelCell = nodeContext.insidePortLabelCells.get(portSide)!;
    const insidePortLabelCellRectangle = insidePortLabelCell.getCellRectangle();
    const insidePortLabelCellPadding = insidePortLabelCell.getPadding();

    // Note that we don't have to distinguish any cases here because the port margins already include space
    // required for labels, if such space is to be reserved. Yay!
    const state: FreePlacement = {
      portAlignment: nodeContext.getPortAlignment(portSide),
      availableSpace:
        insidePortLabelCellRectangle.height - insidePortLabelCellPadding.top - insidePortLabelCellPadding.bottom,
      calculatedPortPlacementSize: insidePortLabelCell.getMinimumContentAreaSize().y,
      currentPos: insidePortLabelCellRectangle.y + insidePortLabelCellPadding.top,
      spaceBetweenPorts: nodeContext.portPortSpacing,
    };
    const nodeWidth = nodeContext.nodeSize.x;

    PortPlacementCalculator.centerSinglePort(nodeContext, portSide, state);
    PortPlacementCalculator.distributeAvailableSpace(nodeContext, portSide, state);

    // Iterate over all ports and place them
    for (const portContext of nodeContext.portContexts.get(portSide)) {
      portContext.portPosition.x = PortPlacementCalculator.calculateVerticalPortXCoordinate(portContext, nodeWidth);
      portContext.portPosition.y = state.currentPos + portContext.portMargin.top;

      // Update the y coordinate for the next port
      state.currentPos +=
        portContext.portMargin.top +
        portContext.port.getSize().y +
        portContext.portMargin.bottom +
        state.spaceBetweenPorts;
    }
  }

  /**
   * Returns the x coordinate for the given port.
   */
  private static calculateVerticalPortXCoordinate(portContext: PortContext, nodeWidth: number): number {
    const port: GraphAdapters.PortAdapter<unknown> = portContext.port;
    // The x coordinate is set according to the port's offset, if any
    if (port.hasProperty(CoreOptions.PORT_BORDER_OFFSET)) {
      return port.getSide() === PortSide.WEST
        ? -port.getSize().x - port.getProperty(CoreOptions.PORT_BORDER_OFFSET)
        : nodeWidth + port.getProperty(CoreOptions.PORT_BORDER_OFFSET);
    } else {
      return port.getSide() === PortSide.WEST ? -port.getSize().x : nodeWidth;
    }
  }

  // ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Free port placement sections shared by both axes
  //
  // The horizontal and vertical Java methods contain these sections verbatim, differing only in whether the x/width
  // or y/height quantities are used; the axis-specific values are gathered in the FreePlacement record by the callers.

  /**
   * If the port alignment is distributed or justified, but there's only a single port, we change the alignment to
   * center to keep things from looking stupid.
   */
  private static centerSinglePort(nodeContext: NodeContext, portSide: PortSide, state: FreePlacement): void {
    if (
      (state.portAlignment === PortAlignment.DISTRIBUTED || state.portAlignment === PortAlignment.JUSTIFIED) &&
      nodeContext.portContexts.get(portSide).size === 1
    ) {
      state.calculatedPortPlacementSize = PortPlacementCalculator.modifiedPortPlacementSize(
        nodeContext,
        state.portAlignment,
        state.calculatedPortPlacementSize,
      );
      state.portAlignment = PortAlignment.CENTER;
    }
  }

  /**
   * Either crams the ports into the available space or, if they may overhang, aligns them.
   */
  private static distributeAvailableSpace(nodeContext: NodeContext, portSide: PortSide, state: FreePlacement): void {
    const portCount = nodeContext.portContexts.get(portSide).size;

    if (
      state.availableSpace < state.calculatedPortPlacementSize &&
      !nodeContext.sizeOptions.contains(SizeOptions.PORTS_OVERHANG)
    ) {
      // There is not enough space available for the ports, but they are not allowed to overhang either. Reduce
      // the space between them to cram them into the available space.
      if (state.portAlignment === PortAlignment.DISTRIBUTED) {
        state.spaceBetweenPorts += (state.availableSpace - state.calculatedPortPlacementSize) / (portCount + 1);
        state.currentPos += state.spaceBetweenPorts;
      } else {
        state.spaceBetweenPorts += (state.availableSpace - state.calculatedPortPlacementSize) / (portCount - 1);
      }
    } else {
      // We are allowed to overhang. Yay. However, if we use distributed or justified alignment, this is another
      // case where we should fall back to centered alignment
      if (state.availableSpace < state.calculatedPortPlacementSize) {
        state.calculatedPortPlacementSize = PortPlacementCalculator.modifiedPortPlacementSize(
          nodeContext,
          state.portAlignment,
          state.calculatedPortPlacementSize,
        );
        state.portAlignment = PortAlignment.CENTER;
      }

      // Calculate where we need to start placing ports (note that the node size required by the port placement
      // includes left and right surrounding port margins, which changes the formulas a bit from what you'd
      // otherwise expect)
      PortPlacementCalculator.alignPorts(portCount, state);
    }
  }

  /**
   * The alignment switch of the overhang case.
   */
  private static alignPorts(portCount: number, state: FreePlacement): void {
    switch (state.portAlignment) {
      case PortAlignment.BEGIN:
        // There's nothing to do here
        break;

      case PortAlignment.CENTER:
        state.currentPos += (state.availableSpace - state.calculatedPortPlacementSize) / 2;
        break;

      case PortAlignment.END:
        state.currentPos += state.availableSpace - state.calculatedPortPlacementSize;
        break;

      case PortAlignment.DISTRIBUTED: {
        // In this case, if there is not enough space available to place the ports, we are allowed to overhang.
        // We thus need to ensure that we're only ever increasing the port spacing here
        const additionalSpaceBetweenPorts =
          (state.availableSpace - state.calculatedPortPlacementSize) / (portCount + 1);
        state.spaceBetweenPorts += Math.max(0, additionalSpaceBetweenPorts);
        state.currentPos += state.spaceBetweenPorts;
        break;
      }

      case PortAlignment.JUSTIFIED: {
        // In this case, if there is not enough space available to place the ports, we are allowed to overhang.
        // We thus need to ensure that we're only ever increasing the port spacing here
        const additionalSpaceBetweenPorts =
          (state.availableSpace - state.calculatedPortPlacementSize) / (portCount - 1);
        state.spaceBetweenPorts += Math.max(0, additionalSpaceBetweenPorts);
        break;
      }
    }
  }

  // ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Utilities

  /**
   * If we switch from distributed or justified alignment back to centered alignment, this may require us to modify
   * the required port placement size calculated in a previous phase. This is the case if the old alignment was
   * distributed, in which case the placement size includes two port-port spacings we don't need anymore.
   */
  private static modifiedPortPlacementSize(
    nodeContext: NodeContext,
    oldPortAlignment: PortAlignment,
    currentPortPlacementSize: number,
  ): number {
    if (oldPortAlignment === PortAlignment.DISTRIBUTED) {
      return currentPortPlacementSize - 2 * nodeContext.portPortSpacing;
    } else {
      return currentPortPlacementSize;
    }
  }
}
