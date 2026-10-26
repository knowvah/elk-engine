// SPDX-License-Identifier: EPL-2.0
import type { ElkRectangle } from '../../../../../core/math/ElkRectangle.js';
import { PortAlignment } from '../../../../../core/options/PortAlignment.js';
import { PortConstraints } from '../../../../../core/options/PortConstraints.js';
import { PortLabelPlacement } from '../../../../../core/options/PortLabelPlacement.js';
import { PortSide } from '../../../../../core/options/PortSide.js';
import { SizeConstraint } from '../../../../../core/options/SizeConstraint.js';
import { SizeOptions } from '../../../../../core/options/SizeOptions.js';
import { getLabelsBounds } from '../../../../../core/util/ElkUtil.js';
import type { NodeContext } from '../NodeContext.js';
import type { PortContext } from '../PortContext.js';
import { HorizontalPortPlacementSizeCalculator } from './HorizontalPortPlacementSizeCalculator.js';
import { PortPlacementCalculator } from './PortPlacementCalculator.js';

/**
 * The values the fixed ratio loop carries from one port to the next. Java keeps them as locals of the loop's method;
 * they are a record here only so that the loop body can be a separate method (complexity limits).
 */
interface FixedRatioState {
  minHeight: number;
  previousPortContext: PortContext | null;
  previousPortRatio: number;
  previousPortHeight: number;
}

/**
 * Calculates the space required to setup port labels.
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/nodespacing/internal/algorithm/VerticalPortPlacementSizeCalculator.java
 */
export class VerticalPortPlacementSizeCalculator {
  /**
   * No instance required.
   */
  private constructor() {}

  /**
   * Calculates the space required for vertical port placements. If the port placement is not fixed, this will
   * also setup the top and bottom padding of the inside port label placement cells to reflect the amount of space
   * to be left around the port placement.
   */
  static calculateVerticalPortPlacementSize(nodeContext: NodeContext): void {
    const self = VerticalPortPlacementSizeCalculator;

    // We need to calculate the space required by the ports even if ports are not part of the size constraints,
    // since we will use that later to place them
    switch (nodeContext.portConstraints) {
      case PortConstraints.FIXED_POS:
        // We don't have any freedom at all, so simply calculate where the bottommost port is on each side
        self.calculateVerticalNodeSizeRequiredByFixedPosPorts(nodeContext, PortSide.EAST);
        self.calculateVerticalNodeSizeRequiredByFixedPosPorts(nodeContext, PortSide.WEST);
        break;

      case PortConstraints.FIXED_RATIO:
        // We can require the node to be large enough to avoid spacing violations with fixed ratio ports
        self.calculateVerticalNodeSizeRequiredByFixedRatioPorts(nodeContext, PortSide.EAST);
        self.calculateVerticalNodeSizeRequiredByFixedRatioPorts(nodeContext, PortSide.WEST);
        break;

      default:
        // If we are free to place things, make the node large enough to place everything properly
        self.calculateVerticalNodeSizeRequiredByFreePorts(nodeContext, PortSide.EAST);
        self.calculateVerticalNodeSizeRequiredByFreePorts(nodeContext, PortSide.WEST);
        break;
    }
  }

  // ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Fixed Position

  /**
   * Sets up inside port label spaces for fixed position ports. If the node size constraints include ports, we also
   * mess with the cell padding.
   */
  private static calculateVerticalNodeSizeRequiredByFixedPosPorts(nodeContext: NodeContext, portSide: PortSide): void {
    let bottommostPortBorder = 0.0;

    // Check all ports on the correct side
    for (const portContext of nodeContext.portContexts.get(portSide)) {
      bottommostPortBorder = Math.max(bottommostPortBorder, portContext.portPosition.y + portContext.port.getSize().y);
    }

    // Set the cell size and remove top padding since the cell size itself already includes all the space we need
    const cell = nodeContext.insidePortLabelCells.get(portSide)!;
    cell.getPadding().top = 0;
    cell.getMinimumContentAreaSize().y = bottommostPortBorder;
  }

  // ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Fixed Ratio

  /**
   * Sets up inside port label spaces for fixed ratio ports. If the node size constraints include ports, we also
   * mess with the cell padding.
   */
  private static calculateVerticalNodeSizeRequiredByFixedRatioPorts(
    nodeContext: NodeContext,
    portSide: PortSide,
  ): void {
    const cell = nodeContext.insidePortLabelCells.get(portSide)!;

    // Fetch the port contexts on the given side and abort if there are none
    const portContexts = nodeContext.portContexts.get(portSide);
    if (portContexts.isEmpty()) {
      cell.getPadding().top = 0;
      cell.getPadding().bottom = 0;
      return;
    }

    // If port labels are to be respected, we need to calculate the port's margins to do so (we ignore the
    // first port in this process if space-efficient mode is active, port labels are to be placed outside
    // and the port labels are not placed next to the port)
    if (nodeContext.sizeConstraints.contains(SizeConstraint.PORT_LABELS)) {
      VerticalPortPlacementSizeCalculator.setupPortMargins(nodeContext, portSide);
    }

    // Go over all pairs of consecutive ports
    const state: FixedRatioState = {
      minHeight: 0,
      previousPortContext: null,
      previousPortRatio: 0,
      previousPortHeight: 0,
    };

    for (const currentPortContext of portContexts) {
      VerticalPortPlacementSizeCalculator.respectSpacingToPreviousPort(nodeContext, currentPortContext, state);
    }

    // if there are bottom surrounding port margins, apply those as well
    VerticalPortPlacementSizeCalculator.respectBottomSurroundingMargin(nodeContext, state);

    // Set the cell size and remove top padding since the cell size itself already includes all the space we need
    cell.getPadding().top = 0;
    cell.getMinimumContentAreaSize().y = state.minHeight;
  }

  /**
   * The bottom surrounding port margins section at the end of
   * `calculateVerticalNodeSizeRequiredByFixedRatioPorts`.
   */
  private static respectBottomSurroundingMargin(nodeContext: NodeContext, state: FixedRatioState): void {
    if (nodeContext.surroundingPortMargins !== null && nodeContext.surroundingPortMargins.bottom > 0) {
      // We're using the port's bare width here because we don't care about label sizes on the bottommost port
      let requiredSpace = state.previousPortHeight + nodeContext.surroundingPortMargins.bottom;

      // We're only interested in the port's bottom margin if it's label is placed inside
      if (nodeContext.portLabelsPlacement.contains(PortLabelPlacement.INSIDE)) {
        requiredSpace += state.previousPortContext!.portMargin.bottom;
      }

      state.minHeight = Math.max(
        state.minHeight,
        HorizontalPortPlacementSizeCalculator.minSizeRequiredToRespectSpacing(
          requiredSpace,
          state.previousPortRatio,
          1,
        ),
      );
    }
  }

  /**
   * The body of the loop over all ports in the fixed ratio case: finds out things about the current port and what
   * it requires with respect to the previous port, then makes the current port the previous one.
   */
  private static respectSpacingToPreviousPort(
    nodeContext: NodeContext,
    currentPortContext: PortContext,
    state: FixedRatioState,
  ): void {
    // Get the next port and find out things about it
    const currentPortRatio = currentPortContext.port.getProperty(PortPlacementCalculator.PORT_RATIO_OR_POSITION);
    const currentPortHeight = currentPortContext.port.getSize().y;

    if (state.previousPortContext === null) {
      VerticalPortPlacementSizeCalculator.respectTopSurroundingMargin(
        nodeContext,
        currentPortContext,
        state,
        currentPortRatio,
      );
    } else {
      VerticalPortPlacementSizeCalculator.respectPreviousPort(nodeContext, currentPortContext, state, currentPortRatio);
    }

    // Our current port is going to be the previous port during the next iteration
    state.previousPortContext = currentPortContext;
    state.previousPortRatio = currentPortRatio;
    state.previousPortHeight = currentPortHeight;
  }

  /**
   * The first port branch of the loop in `respectSpacingToPreviousPort`.
   */
  private static respectTopSurroundingMargin(
    nodeContext: NodeContext,
    currentPortContext: PortContext,
    state: FixedRatioState,
    currentPortRatio: number,
  ): void {
    // This is the first port, so find out how high the node needs to be to respect the top surrounding
    // port margins, if any
    if (nodeContext.surroundingPortMargins !== null && nodeContext.surroundingPortMargins.top > 0) {
      state.minHeight = Math.max(
        state.minHeight,
        HorizontalPortPlacementSizeCalculator.minSizeRequiredToRespectSpacing(
          nodeContext.surroundingPortMargins.top + currentPortContext.portMargin.top,
          0,
          currentPortRatio,
        ),
      );
    }
  }

  /**
   * The subsequent port branch of the loop in `respectSpacingToPreviousPort`.
   */
  private static respectPreviousPort(
    nodeContext: NodeContext,
    currentPortContext: PortContext,
    state: FixedRatioState,
    currentPortRatio: number,
  ): void {
    const requiredSpace =
      state.previousPortHeight +
      state.previousPortContext!.portMargin.bottom +
      nodeContext.portPortSpacing +
      currentPortContext.portMargin.top;
    state.minHeight = Math.max(
      state.minHeight,
      HorizontalPortPlacementSizeCalculator.minSizeRequiredToRespectSpacing(
        requiredSpace,
        state.previousPortRatio,
        currentPortRatio,
      ),
    );
  }

  // ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Free

  /**
   * Sets up inside port label spaces for free ports.
   */
  private static calculateVerticalNodeSizeRequiredByFreePorts(nodeContext: NodeContext, portSide: PortSide): void {
    const cell = nodeContext.insidePortLabelCells.get(portSide)!;

    // Handle the common case first: if there are no ports, set everything to zero
    if (nodeContext.portContexts.get(portSide).isEmpty()) {
      cell.getPadding().top = 0;
      cell.getPadding().bottom = 0;
      return;
    }

    // Set the padding to match the surrounding port space
    cell.getPadding().top = nodeContext.surroundingPortMargins.top;
    cell.getPadding().bottom = nodeContext.surroundingPortMargins.bottom;

    // If we are to take labels into account, we need to setup the port margins such that they include the space
    // required for their labels
    if (nodeContext.sizeConstraints.contains(SizeConstraint.PORT_LABELS)) {
      VerticalPortPlacementSizeCalculator.setupPortMargins(nodeContext, portSide);
    }

    let height = VerticalPortPlacementSizeCalculator.portHeightPlusPortPortSpacing(nodeContext, portSide);

    // For distributed port alignment, we need to surround the ports by a port-port spacing on each side
    if (nodeContext.getPortAlignment(portSide) === PortAlignment.DISTRIBUTED) {
      height += 2 * nodeContext.portPortSpacing;
    }

    // Set the cell size
    cell.getMinimumContentAreaSize().y = height;
  }

  /**
   * Sets up the port margins of all ports such that they include any space required for labels, subject to any other
   * options that might affect label placement.
   */
  private static setupPortMargins(nodeContext: NodeContext, portSide: PortSide): void {
    const portContexts = nodeContext.portContexts.get(portSide);

    const portLabelsOutside = nodeContext.portLabelsPlacement.contains(PortLabelPlacement.OUTSIDE);
    const alwaysSameSide = nodeContext.portLabelsPlacement.contains(PortLabelPlacement.ALWAYS_SAME_SIDE);
    const alwaysSameSideAbove = nodeContext.portLabelsPlacement.contains(PortLabelPlacement.ALWAYS_OTHER_SAME_SIDE);
    const spaceEfficient = nodeContext.portLabelsPlacement.contains(PortLabelPlacement.SPACE_EFFICIENT);
    const uniformPortSpacing = nodeContext.sizeOptions.contains(SizeOptions.UNIFORM_PORT_SPACING);

    const spaceEfficientPortLabels =
      !alwaysSameSide && !alwaysSameSideAbove && (spaceEfficient || portContexts.size === 2);

    // Set the vertical port margins of all ports according to how their labels will be placed. We'll be
    // modifying the margins soon enough.
    VerticalPortPlacementSizeCalculator.computeVerticalPortMargins(nodeContext, portSide, portLabelsOutside);

    // The topmost and bottommost ports are possibly required
    let extremePortContexts: [PortContext, PortContext] | null = null;

    // If port labels are placed outside, there's stuff we can do
    if (portLabelsOutside) {
      extremePortContexts = VerticalPortPlacementSizeCalculator.trimOutsideMargins(
        portContexts,
        spaceEfficientPortLabels,
      );
    }

    // If ports are placed uniformly, we reflect that here by equalizing all port margins
    if (uniformPortSpacing) {
      VerticalPortPlacementSizeCalculator.unifyPortMargins(portContexts);

      // Uniforming may have reset the topmost port's top and bottommost port's bottom margins
      if (portLabelsOutside) {
        extremePortContexts![0].portMargin.top = 0;
        extremePortContexts![1].portMargin.bottom = 0;
      }
    }
  }

  /**
   * The outside port labels section of `setupPortMargins`: finds the topmost and bottommost ports and removes the
   * margins they do not need. Returns the topmost and the bottommost port context.
   */
  private static trimOutsideMargins(
    portContexts: Iterable<PortContext>,
    spaceEfficientPortLabels: boolean,
  ): [PortContext, PortContext] {
    // Find topmost and bottommost ports
    const portContextIterator = portContexts[Symbol.iterator]();

    const topmostPortContext = portContextIterator.next().value as PortContext;
    let bottommostPortContext = topmostPortContext;

    for (let next = portContextIterator.next(); next.done !== true; next = portContextIterator.next()) {
      bottommostPortContext = next.value;
    }

    // The topmost and bottommost ports don't need their top and bottom margin, respectively
    topmostPortContext.portMargin.top = 0;
    bottommostPortContext.portMargin.bottom = 0;

    // If we place port labels space-efficiently and the topmost port doesn't have its label placed right
    // next to it, it doesn't need its bottom margin either since its label will be placed above
    if (spaceEfficientPortLabels && !topmostPortContext.labelsNextToPort) {
      topmostPortContext.portMargin.bottom = 0;
    }

    return [topmostPortContext, bottommostPortContext];
  }

  /**
   * Sets the vertical margins of all ports such that they include the space necessary to place their labels.
   */
  private static computeVerticalPortMargins(
    nodeContext: NodeContext,
    portSide: PortSide,
    _portLabelsOutside: boolean,
  ): void {
    for (const portContext of nodeContext.portContexts.get(portSide)) {
      const labelHeight = portContext.portLabelCell !== null ? portContext.portLabelCell.getMinimumHeight() : 0;

      if (labelHeight > 0) {
        VerticalPortPlacementSizeCalculator.addLabelHeightToMargins(nodeContext, portContext, labelHeight);
      } else if (PortLabelPlacement.isFixed(nodeContext.portLabelsPlacement)) {
        VerticalPortPlacementSizeCalculator.addFixedLabelsToMargins(portContext);
      }
    }
  }

  /**
   * The `labelHeight > 0` branch of the loop in `computeVerticalPortMargins`.
   */
  private static addLabelHeightToMargins(
    nodeContext: NodeContext,
    portContext: PortContext,
    labelHeight: number,
  ): void {
    if (portContext.labelsNextToPort) {
      // The label is placed next to the port
      const portHeight = portContext.port.getSize().y;
      if (labelHeight > portHeight) {
        VerticalPortPlacementSizeCalculator.centerLabelsNextToPort(nodeContext, portContext, labelHeight, portHeight);
      }
    } else {
      // The label is either placed outside (below the port) or possibly inside, but for a compound node,
      // which means that it is placed below the port as well to keep it from overlapping with inside
      // edges
      portContext.portMargin.bottom = nodeContext.portLabelSpacingVertical + labelHeight;
    }
  }

  /**
   * The `labelHeight > portHeight` case of a label placed next to its port.
   */
  private static centerLabelsNextToPort(
    nodeContext: NodeContext,
    portContext: PortContext,
    labelHeight: number,
    portHeight: number,
  ): void {
    const labels = portContext.portLabelCell!.getLabels();
    if (nodeContext.portLabelsTreatAsGroup || labels.length === 1) {
      // We are to center all of the labels
      const overhang = (labelHeight - portHeight) / 2;
      portContext.portMargin.top = overhang;
      portContext.portMargin.bottom = overhang;
    } else {
      // Simulate centering the first port label
      const firstLabelHeight = labels[0]!.getSize().y;
      const firstLabelOverhang = (firstLabelHeight - portHeight) / 2;

      portContext.portMargin.top = Math.max(0, firstLabelOverhang);
      portContext.portMargin.bottom = labelHeight - firstLabelOverhang - portHeight;
    }
  }

  /**
   * The fixed labels branch of the loop in `computeVerticalPortMargins`.
   */
  private static addFixedLabelsToMargins(portContext: PortContext): void {
    // The fixed port label is not considered with portContext.portLabelCell. Nevertheless, a port margin
    // must be added if necessary.
    const labelsBounds: ElkRectangle = getLabelsBounds(portContext.port);
    if (labelsBounds.y < 0) {
      // Add the part of the label that is above the port to the top margin
      portContext.portMargin.top = -labelsBounds.y;
    }
    if (labelsBounds.y + labelsBounds.height > portContext.port.getSize().y) {
      // Add the part of the label that is below the port to the bottom margin
      portContext.portMargin.bottom = labelsBounds.y + labelsBounds.height - portContext.port.getSize().y;
    }
  }

  /**
   * Sets all port margins to be equal to the maximum margins.
   */
  private static unifyPortMargins(portContexts: Iterable<PortContext>): void {
    let maxTop = 0;
    let maxBottom = 0;

    // Find maximum
    for (const portContext of portContexts) {
      maxTop = Math.max(maxTop, portContext.portMargin.top);
      maxBottom = Math.max(maxBottom, portContext.portMargin.bottom);
    }

    // Apply maximum
    for (const portContext of portContexts) {
      portContext.portMargin.top = maxTop;
      portContext.portMargin.bottom = maxBottom;
    }
  }

  /**
   * Takes all ports on the given side, sums up their height, and inserts port-port spacings between them. The
   * margins of ports can be included as well to include space used for labels.
   */
  private static portHeightPlusPortPortSpacing(nodeContext: NodeContext, portSide: PortSide): number {
    let result = 0;

    const portContextIterator = nodeContext.portContexts.get(portSide)[Symbol.iterator]();
    let next = portContextIterator.next();
    while (next.done !== true) {
      const portContext = next.value;
      next = portContextIterator.next();

      result += portContext.portMargin.top + portContext.port.getSize().y + portContext.portMargin.bottom;

      if (next.done !== true) {
        result += nodeContext.portPortSpacing;
      }
    }

    return result;
  }
}
