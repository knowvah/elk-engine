// SPDX-License-Identifier: EPL-2.0
import { PortLabelPlacement } from '../../../../../core/options/PortLabelPlacement.js';
import { PortSide } from '../../../../../core/options/PortSide.js';
import {
  OverlapRemovalDirection,
  RectangleStripOverlapRemover,
} from '../../../overlaps/RectangleStripOverlapRemover.js';
import { HorizontalLabelAlignment } from '../../cellsystem/HorizontalLabelAlignment.js';
import { VerticalLabelAlignment } from '../../cellsystem/VerticalLabelAlignment.js';
import type { NodeContext } from '../NodeContext.js';
import type { PortContext } from '../PortContext.js';
import { PortLabelPlacementCalculatorSimpleOutside } from './PortLabelPlacementCalculatorSimpleOutside.js';

/**
 * The "Constrained Outside Port Labels" section of the port label placement. Split from the Java class (Q1) along its
 * section comment; the loop that adds the rectangles to the overlap remover is a separate method (the "Iterate over
 * our ports" step) to stay within the complexity limits.
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/nodespacing/internal/algorithm/PortLabelPlacementCalculator.java
 */
export class PortLabelPlacementCalculatorConstrainedOutside {
  /**
   * No instance required.
   */
  private constructor() {}

  /**
   * Place the port label cells outside of the node in the knowledge that there might not be enough space to place
   * them without overlaps.
   *
   * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/nodespacing/internal/algorithm/PortLabelPlacementCalculator.java
   */
  static constrainedOutsidePortLabelPlacement(nodeContext: NodeContext, portSide: PortSide): void {
    const portContexts = nodeContext.portContexts.get(portSide);

    // If there are at most two ports on this port side, or if it's neither the northern nor the southern side,
    // simply revert to simple port label placement
    if (portContexts.size <= 2 || portSide === PortSide.EAST || portSide === PortSide.WEST) {
      PortLabelPlacementCalculatorSimpleOutside.simpleOutsidePortLabelPlacement(nodeContext, portSide);
      return;
    }

    // Prepare things
    const overlapRemovalDirection =
      portSide === PortSide.NORTH ? OverlapRemovalDirection.UP : OverlapRemovalDirection.DOWN;

    // Obtain a rectangle strip overlap remover, which will actually do most of the work. Note that, as in Java, the
    // vertical spacing is passed as the horizontal gap and the other way around.
    const overlapRemover = RectangleStripOverlapRemover.createForDirection(overlapRemovalDirection).withGap(
      nodeContext.portLabelSpacingVertical,
      nodeContext.portLabelSpacingHorizontal,
    );

    // Iterate over our ports and add rectangles to the overlap remover. Also, calculate the start coordinate
    let startCoordinate = PortLabelPlacementCalculatorConstrainedOutside.addRectangles(
      nodeContext,
      portSide,
      overlapRemover,
    );

    // The start coordinate needs to be offset by the port-label space
    startCoordinate +=
      portSide === PortSide.NORTH ? -nodeContext.portLabelSpacingVertical : nodeContext.portLabelSpacingVertical;

    // Invoke the overlap remover
    overlapRemover.withStartCoordinate(startCoordinate).removeOverlaps();

    // We need to update the label cell's coordinates to be relative to the ports
    PortLabelPlacementCalculatorConstrainedOutside.makeRelativeToPorts(portContexts);
  }

  /**
   * The "We need to update the label cell's coordinates to be relative to the ports" step of
   * {@link constrainedOutsidePortLabelPlacement}.
   */
  private static makeRelativeToPorts(portContexts: Iterable<PortContext>): void {
    for (const portContext of portContexts) {
      if (portContext.portLabelCell === null || !portContext.portLabelCell.hasLabels()) {
        continue;
      }

      const portLabelCellRect = portContext.portLabelCell.getCellRectangle();

      // Setup the label cell's cell rectangle
      portLabelCellRect.x -= portContext.portPosition.x;
      portLabelCellRect.y -= portContext.portPosition.y;
    }
  }

  /**
   * The "Iterate over our ports..." step of {@link constrainedOutsidePortLabelPlacement}: adds each label cell's
   * rectangle to the overlap remover and tracks the start coordinate.
   *
   * @returns the start coordinate before the port-label space is applied.
   */
  private static addRectangles(
    nodeContext: NodeContext,
    portSide: PortSide,
    overlapRemover: RectangleStripOverlapRemover,
  ): number {
    // If space-efficient port labels are active, the leftmost / topmost port's label must be placed to its left /
    // above it
    let portWithSpecialNeeds = nodeContext.portLabelsPlacement.contains(PortLabelPlacement.SPACE_EFFICIENT);

    let startCoordinate = portSide === PortSide.NORTH ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;

    for (const portContext of nodeContext.portContexts.get(portSide)) {
      if (portContext.portLabelCell === null || !portContext.portLabelCell.hasLabels()) {
        continue;
      }

      PortLabelPlacementCalculatorConstrainedOutside.setUpLabelCell(
        nodeContext,
        portSide,
        portContext,
        portWithSpecialNeeds,
        overlapRemover,
      );
      portWithSpecialNeeds = false;

      // Update start coordinate
      startCoordinate =
        portSide === PortSide.NORTH
          ? Math.min(startCoordinate, portContext.portPosition.y)
          : Math.max(startCoordinate, portContext.portPosition.y + portContext.port.getSize().y);
    }

    return startCoordinate;
  }

  /**
   * The body of the loop in {@link addRectangles} up to adding the rectangle to the overlap remover. Java resets
   * `portWithSpecialNeeds` inside its `if`; here the caller resets it right after this call, which is the same
   * point in the control flow because nothing between reads it.
   */
  private static setUpLabelCell(
    nodeContext: NodeContext,
    portSide: PortSide,
    portContext: PortContext,
    portWithSpecialNeeds: boolean,
    overlapRemover: RectangleStripOverlapRemover,
  ): void {
    const verticalLabelAlignment =
      portSide === PortSide.NORTH ? VerticalLabelAlignment.BOTTOM : VerticalLabelAlignment.TOP;
    const portSize = portContext.port.getSize();
    const portPosition = portContext.portPosition;
    const portLabelCell = portContext.portLabelCell!;
    const portLabelCellRect = portLabelCell.getCellRectangle();

    // Setup the label cell's cell rectangle
    portLabelCellRect.width = portLabelCell.getMinimumWidth();
    portLabelCellRect.height = portLabelCell.getMinimumHeight();
    if (portWithSpecialNeeds) {
      portLabelCellRect.x = portPosition.x - portLabelCell.getMinimumWidth() - nodeContext.portLabelSpacingHorizontal;
    } else {
      portLabelCellRect.x = portPosition.x + portSize.x + nodeContext.portLabelSpacingHorizontal;
    }

    portLabelCell.setVerticalAlignment(verticalLabelAlignment);
    portLabelCell.setHorizontalAlignment(HorizontalLabelAlignment.RIGHT);

    // Add the rectangle to the overlap remover
    overlapRemover.addRectangle(portLabelCellRect);
  }
}
