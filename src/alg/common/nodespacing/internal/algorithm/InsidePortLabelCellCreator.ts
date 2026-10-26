// SPDX-License-Identifier: EPL-2.0
import type { ElkPadding } from '../../../../../core/math/ElkPadding.js';
import { PortLabelPlacement } from '../../../../../core/options/PortLabelPlacement.js';
import { PortSide } from '../../../../../core/options/PortSide.js';
import { AtomicCell } from '../../cellsystem/AtomicCell.js';
import { ContainerArea } from '../../cellsystem/ContainerArea.js';
import type { StripContainerCell } from '../../cellsystem/StripContainerCell.js';
import type { NodeContext } from '../NodeContext.js';

/**
 * Sets up the inside port label cells. These are set up even when there are no inside port labels since they also
 * determine how much space we need to place ports along the node borders.
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/nodespacing/internal/algorithm/InsidePortLabelCellCreator.java
 */
export class InsidePortLabelCellCreator {
  /**
   * No instance required.
   */
  private constructor() {}

  // ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Inside Port Label Cells

  /**
   * Creates all the inside port label cells. Setting them up is left to the port and port label placement code.
   *
   * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/nodespacing/internal/algorithm/InsidePortLabelCellCreator.java
   */
  static createInsidePortLabelCells(nodeContext: NodeContext): void {
    // Create all inside port label cells
    InsidePortLabelCellCreator.createInsidePortLabelCell(
      nodeContext,
      nodeContext.nodeContainer,
      ContainerArea.BEGIN,
      PortSide.NORTH,
    );
    InsidePortLabelCellCreator.createInsidePortLabelCell(
      nodeContext,
      nodeContext.nodeContainer,
      ContainerArea.END,
      PortSide.SOUTH,
    );

    InsidePortLabelCellCreator.createInsidePortLabelCell(
      nodeContext,
      nodeContext.nodeContainerMiddleRow,
      ContainerArea.BEGIN,
      PortSide.WEST,
    );
    InsidePortLabelCellCreator.createInsidePortLabelCell(
      nodeContext,
      nodeContext.nodeContainerMiddleRow,
      ContainerArea.END,
      PortSide.EAST,
    );

    InsidePortLabelCellCreator.setupNorthOrSouthPortLabelCell(nodeContext, PortSide.NORTH);
    InsidePortLabelCellCreator.setupNorthOrSouthPortLabelCell(nodeContext, PortSide.SOUTH);
    InsidePortLabelCellCreator.setupEastOrWestPortLabelCell(nodeContext, PortSide.EAST);
    InsidePortLabelCellCreator.setupEastOrWestPortLabelCell(nodeContext, PortSide.WEST);
  }

  /**
   * Creates a new {@link AtomicCell} for inside port labels. The cell is placed in the given area of the given
   * container cell. Also, the cell is registered to be responsible for ports of the given side.
   */
  private static createInsidePortLabelCell(
    nodeContext: NodeContext,
    container: StripContainerCell,
    containerArea: ContainerArea,
    portSide: PortSide,
  ): void {
    const portLabelCell = new AtomicCell();
    container.setCell(containerArea, portLabelCell);
    nodeContext.insidePortLabelCells.put(portSide, portLabelCell);
  }

  // ///////////////////////////////////////////////////////////////
  // North or South

  /**
   * Sets up all paddings of this cell. We cannot calculate a height yet because that will only become known once
   * inside node label placement has finished.
   */
  private static setupNorthOrSouthPortLabelCell(nodeContext: NodeContext, portSide: PortSide): void {
    const padding = nodeContext.insidePortLabelCells.get(portSide)!.getPadding();

    switch (portSide) {
      case PortSide.NORTH:
        // In case of negative port spacing, do not use it as a padding since this would increase the node size.
        // Needed to ensure that negative label port spacing behaves the same as positive.
        if (nodeContext.portLabelSpacingVertical >= 0) {
          padding.top = nodeContext.portLabelSpacingVertical;
        }
        break;

      case PortSide.SOUTH:
        // In case of negative port spacing, do not use it as a padding since this would increase the node size.
        // Needed to ensure that negative label port spacing behaves the same as positive.
        if (nodeContext.portLabelSpacingVertical >= 0) {
          padding.bottom = nodeContext.portLabelSpacingVertical;
        }
        break;
    }

    // As for the node labels padding, the Java null check is kept although the TS type is non-null.
    if (nodeContext.surroundingPortMargins !== null) {
      padding.left = nodeContext.surroundingPortMargins.left;
      padding.right = nodeContext.surroundingPortMargins.right;
    }
  }

  // ///////////////////////////////////////////////////////////////
  // East or West

  /**
   * Does the work for the port label width calculation for the given port side.
   */
  private static setupEastOrWestPortLabelCell(nodeContext: NodeContext, portSide: PortSide): void {
    if (nodeContext.portLabelsPlacement.contains(PortLabelPlacement.INSIDE)) {
      InsidePortLabelCellCreator.calculateWidthDueToLabels(nodeContext, portSide);
    }
    InsidePortLabelCellCreator.setupTopAndBottomPadding(nodeContext, portSide);
  }

  /**
   * Calculates the cell's width to fit the largest label in there. If there actually is a label, also setup the
   * cell's top or bottom padding to ensure enough space between ports and labels.
   */
  private static calculateWidthDueToLabels(nodeContext: NodeContext, portSide: PortSide): void {
    // Retrieve the appropriate cell
    const theAppropriateCell = nodeContext.insidePortLabelCells.get(portSide)!;
    const minCellSize = theAppropriateCell.getMinimumContentAreaSize();

    for (const portContext of nodeContext.portContexts.get(portSide)) {
      // Update the maximum label width
      if (portContext.portLabelCell !== null) {
        minCellSize.x = Math.max(minCellSize.x, portContext.portLabelCell.getMinimumWidth());
      }
    }

    // If the cell has a minimum width by now, that means we actually have labels in there. Which, in turn, means
    // that we need to add a padding to the cell to ensure enough space between ports and their inside labels
    if (minCellSize.x > 0) {
      switch (portSide) {
        case PortSide.EAST:
          theAppropriateCell.getPadding().right = nodeContext.portLabelSpacingHorizontal;
          break;

        case PortSide.WEST:
          theAppropriateCell.getPadding().left = nodeContext.portLabelSpacingHorizontal;
          break;
      }
    }
  }

  /**
   * Sets up the cell's top and bottom padding to match the surrounding port margins.
   */
  private static setupTopAndBottomPadding(nodeContext: NodeContext, portSide: PortSide): void {
    if (nodeContext.surroundingPortMargins !== null) {
      const padding: ElkPadding = nodeContext.insidePortLabelCells.get(portSide)!.getPadding();
      padding.top = nodeContext.surroundingPortMargins.top;
      padding.bottom = nodeContext.surroundingPortMargins.bottom;
    }
  }
}
