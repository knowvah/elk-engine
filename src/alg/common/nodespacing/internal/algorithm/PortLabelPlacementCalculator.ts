// SPDX-License-Identifier: EPL-2.0
import { PortConstraints } from '../../../../../core/options/PortConstraints.js';
import { PortLabelPlacement } from '../../../../../core/options/PortLabelPlacement.js';
import { PortSide } from '../../../../../core/options/PortSide.js';
import { SizeConstraint } from '../../../../../core/options/SizeConstraint.js';
import type { NodeContext } from '../NodeContext.js';
import { PortLabelPlacementCalculatorConstrainedInside } from './PortLabelPlacementCalculatorConstrainedInside.js';
import { PortLabelPlacementCalculatorConstrainedOutside } from './PortLabelPlacementCalculatorConstrainedOutside.js';
import { PortLabelPlacementCalculatorSimpleInside } from './PortLabelPlacementCalculatorSimpleInside.js';
import { PortLabelPlacementCalculatorSimpleOutside } from './PortLabelPlacementCalculatorSimpleOutside.js';

/**
 * Knows how to place port labels. The Java class is over the file size limit, so the four placement sections live in
 * `PortLabelPlacementCalculator{SimpleInside,ConstrainedInside,SimpleOutside,ConstrainedOutside}` (Q1); this facade
 * keeps the public entry points and the dispatch.
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/nodespacing/internal/algorithm/PortLabelPlacementCalculator.java
 */
export class PortLabelPlacementCalculator {
  /**
   * No instance required.
   */
  private constructor() {}

  /**
   * Places port labels for northern and southern ports. If port labels are placed on the inside, the height required
   * for the placement is set as the height of the content area of northern and southern inside port label cells.
   */
  static placeHorizontalPortLabels(nodeContext: NodeContext): void {
    PortLabelPlacementCalculator.placePortLabels(nodeContext, PortSide.NORTH);
    PortLabelPlacementCalculator.placePortLabels(nodeContext, PortSide.SOUTH);
  }

  /**
   * Places port labels for eastern and western ports.
   */
  static placeVerticalPortLabels(nodeContext: NodeContext): void {
    PortLabelPlacementCalculator.placePortLabels(nodeContext, PortSide.EAST);
    PortLabelPlacementCalculator.placePortLabels(nodeContext, PortSide.WEST);
  }

  /**
   * Places port labels for ports on the given side.
   */
  private static placePortLabels(nodeContext: NodeContext, portSide: PortSide): void {
    // If port labels were not taken into account when calculating the node size or if port placement was set to
    // fixed positions, we don't have an arbitrary amount of freedom to place our labels
    const constrainedPlacement =
      !nodeContext.sizeConstraints.contains(SizeConstraint.PORT_LABELS) ||
      nodeContext.portConstraints === PortConstraints.FIXED_POS;

    if (nodeContext.portLabelsPlacement.contains(PortLabelPlacement.INSIDE)) {
      if (constrainedPlacement) {
        PortLabelPlacementCalculatorConstrainedInside.constrainedInsidePortLabelPlacement(nodeContext, portSide);
      } else {
        PortLabelPlacementCalculatorSimpleInside.simpleInsidePortLabelPlacement(nodeContext, portSide);
      }
    } else if (nodeContext.portLabelsPlacement.contains(PortLabelPlacement.OUTSIDE)) {
      if (constrainedPlacement) {
        PortLabelPlacementCalculatorConstrainedOutside.constrainedOutsidePortLabelPlacement(nodeContext, portSide);
      } else {
        PortLabelPlacementCalculatorSimpleOutside.simpleOutsidePortLabelPlacement(nodeContext, portSide);
      }
    }
  }
}
