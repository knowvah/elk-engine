// SPDX-License-Identifier: EPL-2.0
import { PortLabelPlacement } from '../../../../../core/options/PortLabelPlacement.js';
import { PortSide } from '../../../../../core/options/PortSide.js';
import { HorizontalLabelAlignment } from '../../cellsystem/HorizontalLabelAlignment.js';
import type { LabelCell } from '../../cellsystem/LabelCell.js';
import { VerticalLabelAlignment } from '../../cellsystem/VerticalLabelAlignment.js';
import type { NodeContext } from '../NodeContext.js';
import type { PortContext } from '../PortContext.js';
import { NodeLabelAndSizeUtilities } from './NodeLabelAndSizeUtilities.js';

/** The locals of the `simpleOutsidePortLabelPlacement` loop body that the per-side arms need. */
interface OutsideCellPlacement {
  readonly nodeContext: NodeContext;
  readonly portSide: PortSide;
  readonly portContext: PortContext;
  readonly portLabelCell: LabelCell;
  /** `placeFirstPortDifferently || alwaysAbove`. */
  readonly differentlyOrAbove: boolean;
}

/**
 * The "Simple Outside Port Labels" section of the port label placement. Split from the Java class (Q1) along its
 * section comment; the switch arms of `simpleOutsidePortLabelPlacement` are separate methods to stay within the
 * complexity limits. The methods are private in Java; here they are package-visible statics because the constrained
 * section calls them.
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/nodespacing/internal/algorithm/PortLabelPlacementCalculator.java
 */
export class PortLabelPlacementCalculatorSimpleOutside {
  /**
   * No instance required.
   */
  private constructor() {}

  /**
   * Place the port label cells outside of the node.
   *
   * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/nodespacing/internal/algorithm/PortLabelPlacementCalculator.java
   */
  static simpleOutsidePortLabelPlacement(nodeContext: NodeContext, portSide: PortSide): void {
    const portContexts = nodeContext.portContexts.get(portSide);

    // If there are only two ports on a side, we place the first port's label on its other side to make it
    // especially clear which port it belongs to. The same applies if the user requested space-efficient mode
    let placeFirstPortDifferently = NodeLabelAndSizeUtilities.isFirstOutsidePortLabelPlacedDifferently(
      nodeContext,
      portSide,
    );

    const alwaysAbove = nodeContext.portLabelsPlacement.contains(PortLabelPlacement.ALWAYS_OTHER_SAME_SIDE);

    for (const portContext of portContexts) {
      // If the port doesn't have labels, skip
      if (portContext.portLabelCell === null || !portContext.portLabelCell.hasLabels()) {
        continue;
      }

      // Retrieve the label cell and its rectangle and set the rectangle's size (we will use the rectangle to
      // place the cell relative to the port below)
      const portLabelCell = portContext.portLabelCell;
      const portLabelCellRect = portLabelCell.getCellRectangle();
      portLabelCellRect.width = portLabelCell.getMinimumWidth();
      portLabelCellRect.height = portLabelCell.getMinimumHeight();

      // Calculate the position of the port's label space
      PortLabelPlacementCalculatorSimpleOutside.placeOutsideLabelCell({
        nodeContext,
        portSide,
        portContext,
        portLabelCell,
        differentlyOrAbove: placeFirstPortDifferently || alwaysAbove,
      });

      // The next port definitely doesn't have special needs anymore
      placeFirstPortDifferently = false;
    }
  }

  /**
   * The `switch (portSide)` of the loop body in `simpleOutsidePortLabelPlacement`, one method per arm. Java has no
   * default arm here, so an undefined side leaves the rectangle as it is. The arms share the loop's locals through
   * an {@link OutsideCellPlacement}; `placeFirstPortDifferently || alwaysAbove` is only ever read as that
   * disjunction, so it is passed as one value.
   */
  private static placeOutsideLabelCell(args: OutsideCellPlacement): void {
    switch (args.portSide) {
      case PortSide.NORTH:
        PortLabelPlacementCalculatorSimpleOutside.placeNorth(args);
        break;

      case PortSide.SOUTH:
        PortLabelPlacementCalculatorSimpleOutside.placeSouth(args);
        break;

      case PortSide.EAST:
        PortLabelPlacementCalculatorSimpleOutside.placeEast(args);
        break;

      case PortSide.WEST:
        PortLabelPlacementCalculatorSimpleOutside.placeWest(args);
        break;
    }
  }

  /** The `case NORTH` arm of {@link placeOutsideLabelCell}. */
  private static placeNorth(args: OutsideCellPlacement): void {
    const { nodeContext, portContext, portLabelCell, differentlyOrAbove } = args;
    const portSize = portContext.port.getSize();
    const portLabelCellRect = portLabelCell.getCellRectangle();
    if (portContext.labelsNextToPort) {
      portLabelCellRect.x = (portSize.x - portLabelCellRect.width) / 2;
      portLabelCell.setHorizontalAlignment(HorizontalLabelAlignment.CENTER);
    } else if (differentlyOrAbove) {
      portLabelCellRect.x = -portLabelCellRect.width - nodeContext.portLabelSpacingHorizontal;
      portLabelCell.setHorizontalAlignment(HorizontalLabelAlignment.RIGHT);
    } else {
      portLabelCellRect.x = portSize.x + nodeContext.portLabelSpacingHorizontal;
      portLabelCell.setHorizontalAlignment(HorizontalLabelAlignment.LEFT);
    }
    portLabelCellRect.y = -portLabelCellRect.height - nodeContext.portLabelSpacingVertical;
    portLabelCell.setVerticalAlignment(VerticalLabelAlignment.BOTTOM);
  }

  /** The `case SOUTH` arm of {@link placeOutsideLabelCell}. */
  private static placeSouth(args: OutsideCellPlacement): void {
    const { nodeContext, portContext, portLabelCell, differentlyOrAbove } = args;
    const portSize = portContext.port.getSize();
    const portLabelCellRect = portLabelCell.getCellRectangle();
    if (portContext.labelsNextToPort) {
      portLabelCellRect.x = (portSize.x - portLabelCellRect.width) / 2;
      portLabelCell.setHorizontalAlignment(HorizontalLabelAlignment.CENTER);
    } else if (differentlyOrAbove) {
      portLabelCellRect.x = -portLabelCellRect.width - nodeContext.portLabelSpacingHorizontal;
      portLabelCell.setHorizontalAlignment(HorizontalLabelAlignment.RIGHT);
    } else {
      portLabelCellRect.x = portSize.x + nodeContext.portLabelSpacingHorizontal;
      portLabelCell.setHorizontalAlignment(HorizontalLabelAlignment.LEFT);
    }
    portLabelCellRect.y = portSize.y + nodeContext.portLabelSpacingVertical;
    portLabelCell.setVerticalAlignment(VerticalLabelAlignment.TOP);
  }

  /** The `case EAST` arm of {@link placeOutsideLabelCell}. */
  private static placeEast(args: OutsideCellPlacement): void {
    const { nodeContext, portContext, portLabelCell } = args;
    const portSize = portContext.port.getSize();
    const portLabelCellRect = portLabelCell.getCellRectangle();
    PortLabelPlacementCalculatorSimpleOutside.placeVertically(args);
    portLabelCellRect.x = portSize.x + nodeContext.portLabelSpacingHorizontal;
    portLabelCell.setHorizontalAlignment(HorizontalLabelAlignment.LEFT);
  }

  /** The `case WEST` arm of {@link placeOutsideLabelCell}. */
  private static placeWest(args: OutsideCellPlacement): void {
    const { nodeContext, portLabelCell } = args;
    const portLabelCellRect = portLabelCell.getCellRectangle();
    PortLabelPlacementCalculatorSimpleOutside.placeVertically(args);
    portLabelCellRect.x = -portLabelCellRect.width - nodeContext.portLabelSpacingHorizontal;
    portLabelCell.setHorizontalAlignment(HorizontalLabelAlignment.RIGHT);
  }

  /**
   * The `if (labelsNextToPort) ... else if (placeFirstPortDifferently || alwaysAbove) ... else ...` block that the
   * EAST and WEST arms repeat verbatim in Java. Pulled out because both arms would otherwise exceed the complexity
   * limit; the code is identical in both.
   */
  private static placeVertically(args: OutsideCellPlacement): void {
    const { nodeContext, portContext, portLabelCell, differentlyOrAbove } = args;
    const portLabelCellRect = portLabelCell.getCellRectangle();
    const portSize = portContext.port.getSize();
    if (portContext.labelsNextToPort) {
      const labelHeight = nodeContext.portLabelsTreatAsGroup
        ? portLabelCellRect.height
        : portLabelCell.getLabels()[0]!.getSize().y;
      portLabelCellRect.y = (portSize.y - labelHeight) / 2;
      portLabelCell.setVerticalAlignment(VerticalLabelAlignment.CENTER);
    } else if (differentlyOrAbove) {
      portLabelCellRect.y = -portLabelCellRect.height - nodeContext.portLabelSpacingVertical;
      portLabelCell.setVerticalAlignment(VerticalLabelAlignment.BOTTOM);
    } else {
      portLabelCellRect.y = portSize.y + nodeContext.portLabelSpacingVertical;
      portLabelCell.setVerticalAlignment(VerticalLabelAlignment.TOP);
    }
  }
}
