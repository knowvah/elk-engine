// SPDX-License-Identifier: EPL-2.0
import type { ElkRectangle } from '../../../../../core/math/ElkRectangle.js';
import { ElkMath } from '../../../../../core/math/ElkMath.js';
import type { KVector } from '../../../../../core/math/KVector.js';
import { PortSide } from '../../../../../core/options/PortSide.js';
import {
  OverlapRemovalDirection,
  RectangleStripOverlapRemover,
} from '../../../overlaps/RectangleStripOverlapRemover.js';
import { HorizontalLabelAlignment } from '../../cellsystem/HorizontalLabelAlignment.js';
import { VerticalLabelAlignment } from '../../cellsystem/VerticalLabelAlignment.js';
import type { NodeContext } from '../NodeContext.js';
import type { PortContext } from '../PortContext.js';
import { PortLabelPlacementCalculatorSimpleInside } from './PortLabelPlacementCalculatorSimpleInside.js';

/**
 * The "Constrained Inside Port Labels" section of the port label placement. Split from the Java class (Q1) along its
 * section comment; the loop that adds the rectangles to the overlap remover is a separate method (the "Iterate over
 * our ports" step) to stay within the complexity limits.
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/nodespacing/internal/algorithm/PortLabelPlacementCalculator.java
 */
export class PortLabelPlacementCalculatorConstrainedInside {
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
  static constrainedInsidePortLabelPlacement(nodeContext: NodeContext, portSide: PortSide): void {
    const portContexts = nodeContext.portContexts.get(portSide);

    // If it's neither the northern nor the southern side, simply revert to simple port label placement
    if (portSide === PortSide.EAST || portSide === PortSide.WEST) {
      PortLabelPlacementCalculatorSimpleInside.simpleInsidePortLabelPlacement(nodeContext, portSide);
      return;
    }

    // Prepare things
    const overlapRemovalDirection =
      portSide === PortSide.NORTH ? OverlapRemovalDirection.DOWN : OverlapRemovalDirection.UP;

    // Obtain a rectangle strip overlap remover, which will actually do most of the work
    const overlapRemover = RectangleStripOverlapRemover.createForDirection(overlapRemovalDirection).withGap(
      nodeContext.portLabelSpacingHorizontal,
      nodeContext.portLabelSpacingVertical,
    );

    // Iterate over our ports and add rectangles to the overlap remover. Also, calculate the start coordinate
    let startCoordinate = PortLabelPlacementCalculatorConstrainedInside.addRectangles(
      nodeContext,
      portSide,
      overlapRemover,
    );

    // The start coordinate needs to be offset by the port-label space
    startCoordinate +=
      portSide === PortSide.NORTH ? nodeContext.portLabelSpacingVertical : -nodeContext.portLabelSpacingVertical;

    // Invoke the overlap remover
    const stripHeight = overlapRemover.withStartCoordinate(startCoordinate).removeOverlaps();

    if (stripHeight > 0) {
      nodeContext.insidePortLabelCells.get(portSide)!.getMinimumContentAreaSize().y = stripHeight;
    }

    // We need to update the label cell's coordinates to be relative to the ports
    PortLabelPlacementCalculatorConstrainedInside.makeRelativeToPorts(portContexts);
  }

  /**
   * The "We need to update the label cell's coordinates to be relative to the ports" step of
   * {@link constrainedInsidePortLabelPlacement}.
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
   * The "Iterate over our ports..." step of {@link constrainedInsidePortLabelPlacement}: adds each label cell's
   * rectangle to the overlap remover and tracks the start coordinate.
   *
   * @returns the start coordinate before the port-label space is applied.
   */
  private static addRectangles(
    nodeContext: NodeContext,
    portSide: PortSide,
    overlapRemover: RectangleStripOverlapRemover,
  ): number {
    const [leftBorder, rightBorder] = PortLabelPlacementCalculatorConstrainedInside.contentAreaBorders(
      nodeContext,
      portSide,
    );

    let startCoordinate = portSide === PortSide.NORTH ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;

    for (const portContext of nodeContext.portContexts.get(portSide)) {
      if (portContext.portLabelCell === null || !portContext.portLabelCell.hasLabels()) {
        continue;
      }

      PortLabelPlacementCalculatorConstrainedInside.setUpLabelCell(
        portContext,
        portSide,
        leftBorder,
        rightBorder,
        overlapRemover,
      );

      // Update start coordinate
      startCoordinate =
        portSide === PortSide.NORTH
          ? Math.max(startCoordinate, portContext.portPosition.y + portContext.port.getSize().y)
          : Math.min(startCoordinate, portContext.portPosition.y);
    }

    return startCoordinate;
  }

  /**
   * The "To keep labels from extending over the content area..." step: the left and right boundary labels must stay
   * within, always keeping a bit of space to the node border. Java computes both inline before its loop.
   *
   * @returns the left and right border.
   */
  private static contentAreaBorders(nodeContext: NodeContext, portSide: PortSide): [number, number] {
    const insidePortLabelContainer = nodeContext.insidePortLabelCells.get(portSide)!;
    const labelContainerRect = insidePortLabelContainer.getCellRectangle();
    const leftBorder =
      labelContainerRect.x +
      ElkMath.maxd(
        insidePortLabelContainer.getPadding().left,
        nodeContext.surroundingPortMargins.left,
        nodeContext.nodeLabelSpacing,
      );
    const rightBorder =
      labelContainerRect.x +
      labelContainerRect.width -
      ElkMath.maxd(
        insidePortLabelContainer.getPadding().right,
        nodeContext.surroundingPortMargins.right,
        nodeContext.nodeLabelSpacing,
      );
    return [leftBorder, rightBorder];
  }

  /**
   * The body of the loop in {@link addRectangles} up to adding the rectangle to the overlap remover. Java declares
   * the vertical alignment once before the loop; it depends only on the side, so it is derived here.
   */
  private static setUpLabelCell(
    portContext: PortContext,
    portSide: PortSide,
    leftBorder: number,
    rightBorder: number,
    overlapRemover: RectangleStripOverlapRemover,
  ): void {
    const verticalLabelAlignment =
      portSide === PortSide.NORTH ? VerticalLabelAlignment.TOP : VerticalLabelAlignment.BOTTOM;
    const portSize = portContext.port.getSize();
    const portPosition = portContext.portPosition;
    const portLabelCell = portContext.portLabelCell!;
    const portLabelCellRect = portLabelCell.getCellRectangle();

    // Setup the less interesting cell properties
    portLabelCellRect.width = portLabelCell.getMinimumWidth();
    portLabelCellRect.height = portLabelCell.getMinimumHeight();

    portLabelCell.setVerticalAlignment(verticalLabelAlignment);
    portLabelCell.setHorizontalAlignment(HorizontalLabelAlignment.RIGHT);

    // Center the label, but make sure it doesn't hang over the node boundaries
    PortLabelPlacementCalculatorConstrainedInside.centerPortLabel(
      portLabelCellRect,
      portPosition,
      portSize,
      leftBorder,
      rightBorder,
    );

    // Add the rectangle to the overlap remover
    overlapRemover.addRectangle(portLabelCellRect);
  }

  /**
   * Centers the given label under its port, but makes an effort to keep it from hanging over the given minimum and
   * maximum coordinates. The label position is absolute, not relative to the port.
   *
   * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/nodespacing/internal/algorithm/PortLabelPlacementCalculator.java
   */
  private static centerPortLabel(
    portLabelCellRect: ElkRectangle,
    portPosition: KVector,
    portSize: KVector,
    minX: number,
    maxX: number,
  ): void {
    // Center the label
    portLabelCellRect.x = portPosition.x - (portLabelCellRect.width - portSize.x) / 2;

    // Make sure that the label won't slide past the port
    const actualMinX = Math.min(minX, portPosition.x);
    const actualMaxX = Math.max(maxX, portPosition.x + portSize.x);

    // Make sure that the label stays inside the boundaries, but only correct in one of the two possible directions
    if (portLabelCellRect.x < actualMinX) {
      portLabelCellRect.x = actualMinX;
    } else if (portLabelCellRect.x + portLabelCellRect.width > actualMaxX) {
      portLabelCellRect.x = actualMaxX - portLabelCellRect.width;
    }
  }
}
