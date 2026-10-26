// SPDX-License-Identifier: EPL-2.0
import type { ElkRectangle } from '../../../../../core/math/ElkRectangle.js';
import { CoreOptions } from '../../../../../core/options/CoreOptions.js';
import { PortSide } from '../../../../../core/options/PortSide.js';
import { HorizontalLabelAlignment } from '../../cellsystem/HorizontalLabelAlignment.js';
import type { LabelCell } from '../../cellsystem/LabelCell.js';
import { VerticalLabelAlignment } from '../../cellsystem/VerticalLabelAlignment.js';
import type { NodeContext } from '../NodeContext.js';
import type { PortContext } from '../PortContext.js';

/** The locals of the `simpleInsidePortLabelPlacement` loop body that the per-side arms need. */
interface InsideCellPlacement {
  readonly nodeContext: NodeContext;
  readonly portSide: PortSide;
  readonly portContext: PortContext;
  readonly portLabelCell: LabelCell;
  readonly portBorderOffset: number;
  readonly labelBorderOffset: number;
}

/**
 * The "Simple Inside Port Labels" section of the port label placement. Split from the Java class (Q1) along its
 * section comment, and the switch arms of `simpleInsidePortLabelPlacement` are separate methods to stay within the
 * complexity limits. The methods are private in Java; here they are package-visible statics because the facade and
 * the constrained section call them.
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/nodespacing/internal/algorithm/PortLabelPlacementCalculator.java
 */
export class PortLabelPlacementCalculatorSimpleInside {
  /**
   * No instance required.
   */
  private constructor() {}

  /**
   * Place the port label cells on the node's insides.
   *
   * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/nodespacing/internal/algorithm/PortLabelPlacementCalculator.java
   */
  static simpleInsidePortLabelPlacement(nodeContext: NodeContext, portSide: PortSide): void {
    // For northern and southern port labels, we need to set the inside port label cell's client height later
    let insideNorthOrSouthPortLabelAreaHeight = 0;

    // Some spacings we may need later
    const labelBorderOffset = PortLabelPlacementCalculatorSimpleInside.portLabelBorderOffsetForPortSide(
      nodeContext,
      portSide,
    );

    for (const portContext of nodeContext.portContexts.get(portSide)) {
      // If the port doesn't have labels, skip
      if (portContext.portLabelCell === null || !portContext.portLabelCell.hasLabels()) {
        continue;
      }

      PortLabelPlacementCalculatorSimpleInside.placePortLabelCell(
        nodeContext,
        portSide,
        portContext,
        labelBorderOffset,
      );

      // If we have a north or south port, update our port label area height
      if (portSide === PortSide.NORTH || portSide === PortSide.SOUTH) {
        insideNorthOrSouthPortLabelAreaHeight = Math.max(
          insideNorthOrSouthPortLabelAreaHeight,
          portContext.portLabelCell.getCellRectangle().height,
        );
      }
    }

    // If we have a northern or southern label area height, apply it
    if (insideNorthOrSouthPortLabelAreaHeight > 0) {
      nodeContext.insidePortLabelCells.get(portSide)!.getMinimumContentAreaSize().y =
        insideNorthOrSouthPortLabelAreaHeight;
    }
  }

  /**
   * The loop body of {@link simpleInsidePortLabelPlacement} between the skip check and the area height update:
   * reads the port border offset, sizes the label cell's rectangle and places it.
   */
  private static placePortLabelCell(
    nodeContext: NodeContext,
    portSide: PortSide,
    portContext: PortContext,
    labelBorderOffset: number,
  ): void {
    // Retrieve information about the port itself
    const portBorderOffset = portContext.port.hasProperty(CoreOptions.PORT_BORDER_OFFSET)
      ? portContext.port.getProperty(CoreOptions.PORT_BORDER_OFFSET)
      : 0;

    // Retrieve the label cell and its rectangle and set the rectangle's size (we will use the rectangle to
    // place the cell relative to the port below)
    const portLabelCell = portContext.portLabelCell!;
    const portLabelCellRect = portLabelCell.getCellRectangle();
    portLabelCellRect.width = portLabelCell.getMinimumWidth();
    portLabelCellRect.height = portLabelCell.getMinimumHeight();

    // Calculate the position of the port's label cell. If the node is a compound node, we make an effort to
    // place port labels such that edges won't cross them
    PortLabelPlacementCalculatorSimpleInside.placeInsideLabelCell({
      nodeContext,
      portSide,
      portContext,
      portLabelCell,
      portBorderOffset,
      labelBorderOffset,
    });
  }

  /**
   * The `switch (portSide)` of the loop body in `simpleInsidePortLabelPlacement`, one method per arm. Java has no
   * default arm here, so an undefined side leaves the rectangle as it is. The arms share the loop's locals through
   * an {@link InsideCellPlacement} (five parameters is the complexity limit).
   */
  private static placeInsideLabelCell(args: InsideCellPlacement): void {
    switch (args.portSide) {
      case PortSide.NORTH:
        PortLabelPlacementCalculatorSimpleInside.placeNorth(args);
        break;

      case PortSide.SOUTH:
        PortLabelPlacementCalculatorSimpleInside.placeSouth(args);
        break;

      case PortSide.EAST:
        PortLabelPlacementCalculatorSimpleInside.placeEast(args);
        break;

      case PortSide.WEST:
        PortLabelPlacementCalculatorSimpleInside.placeWest(args);
        break;
    }
  }

  /** The `case NORTH` arm of {@link placeInsideLabelCell}. */
  private static placeNorth(args: InsideCellPlacement): void {
    const { nodeContext, portContext, portLabelCell, portBorderOffset, labelBorderOffset } = args;
    const portSize = portContext.port.getSize();
    const portLabelCellRect = portLabelCell.getCellRectangle();
    portLabelCellRect.x = portContext.labelsNextToPort
      ? (portSize.x - portLabelCellRect.width) / 2
      : portSize.x + nodeContext.portLabelSpacingHorizontal;
    portLabelCellRect.y = portSize.y + portBorderOffset + labelBorderOffset;
    portLabelCell.setHorizontalAlignment(HorizontalLabelAlignment.CENTER);
    portLabelCell.setVerticalAlignment(VerticalLabelAlignment.TOP);
  }

  /** The `case SOUTH` arm of {@link placeInsideLabelCell}. */
  private static placeSouth(args: InsideCellPlacement): void {
    const { nodeContext, portContext, portLabelCell, portBorderOffset, labelBorderOffset } = args;
    const portSize = portContext.port.getSize();
    const portLabelCellRect = portLabelCell.getCellRectangle();
    portLabelCellRect.x = portContext.labelsNextToPort
      ? (portSize.x - portLabelCellRect.width) / 2
      : portSize.x + nodeContext.portLabelSpacingHorizontal;
    portLabelCellRect.y = -portBorderOffset - labelBorderOffset - portLabelCellRect.height;
    portLabelCell.setHorizontalAlignment(HorizontalLabelAlignment.CENTER);
    portLabelCell.setVerticalAlignment(VerticalLabelAlignment.BOTTOM);
  }

  /** The `case EAST` arm of {@link placeInsideLabelCell}. */
  private static placeEast(args: InsideCellPlacement): void {
    const { nodeContext, portContext, portLabelCell, portBorderOffset, labelBorderOffset } = args;
    const portLabelCellRect = portLabelCell.getCellRectangle();
    portLabelCellRect.x = -portBorderOffset - labelBorderOffset - portLabelCellRect.width;
    PortLabelPlacementCalculatorSimpleInside.placeVertically(
      nodeContext,
      portContext,
      portLabelCell,
      portLabelCellRect,
    );
    portLabelCell.setHorizontalAlignment(HorizontalLabelAlignment.RIGHT);
    portLabelCell.setVerticalAlignment(VerticalLabelAlignment.CENTER);
  }

  /** The `case WEST` arm of {@link placeInsideLabelCell}. */
  private static placeWest(args: InsideCellPlacement): void {
    const { nodeContext, portContext, portLabelCell, portBorderOffset, labelBorderOffset } = args;
    const portSize = portContext.port.getSize();
    const portLabelCellRect = portLabelCell.getCellRectangle();
    portLabelCellRect.x = portSize.x + portBorderOffset + labelBorderOffset;
    PortLabelPlacementCalculatorSimpleInside.placeVertically(
      nodeContext,
      portContext,
      portLabelCell,
      portLabelCellRect,
    );
    portLabelCell.setHorizontalAlignment(HorizontalLabelAlignment.LEFT);
    portLabelCell.setVerticalAlignment(VerticalLabelAlignment.CENTER);
  }

  /**
   * The `if (portContext.labelsNextToPort) ... else ...` block that the EAST and WEST arms repeat verbatim in Java.
   * Pulled out because both arms would otherwise exceed the complexity limit; the code is identical in both.
   */
  private static placeVertically(
    nodeContext: NodeContext,
    portContext: PortContext,
    portLabelCell: LabelCell,
    portLabelCellRect: ElkRectangle,
  ): void {
    const portSize = portContext.port.getSize();
    if (portContext.labelsNextToPort) {
      const labelHeight = nodeContext.portLabelsTreatAsGroup
        ? portLabelCellRect.height
        : portLabelCell.getLabels()[0]!.getSize().y;
      portLabelCellRect.y = (portSize.y - labelHeight) / 2;
    } else {
      portLabelCellRect.y = portSize.y + nodeContext.portLabelSpacingVertical;
    }
  }

  /**
   * Returns the amount of space port labels are offset from the node border on the given port side. This takes the
   * port border padding into account as well as the port-label spacing.
   *
   * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/nodespacing/internal/algorithm/PortLabelPlacementCalculator.java
   */
  static portLabelBorderOffsetForPortSide(nodeContext: NodeContext, portSide: PortSide): number {
    switch (portSide) {
      case PortSide.NORTH:
        return nodeContext.nodeContainer.getPadding().top + nodeContext.portLabelSpacingVertical;

      case PortSide.SOUTH:
        return nodeContext.nodeContainer.getPadding().bottom + nodeContext.portLabelSpacingVertical;

      case PortSide.EAST:
        return nodeContext.nodeContainer.getPadding().right + nodeContext.portLabelSpacingHorizontal;

      case PortSide.WEST:
        return nodeContext.nodeContainer.getPadding().left + nodeContext.portLabelSpacingHorizontal;

      default:
      // PortLabelPlacementCalculator.java:208 `assert false` stays a comment (NS5).
    }

    return 0;
  }
}
