// SPDX-License-Identifier: EPL-2.0
import type { ElkRectangle } from '../../../../../core/math/ElkRectangle.js';
import { PortAlignment } from '../../../../../core/options/PortAlignment.js';
import { PortConstraints } from '../../../../../core/options/PortConstraints.js';
import { PortLabelPlacement } from '../../../../../core/options/PortLabelPlacement.js';
import { PortSide } from '../../../../../core/options/PortSide.js';
import { SizeConstraint } from '../../../../../core/options/SizeConstraint.js';
import { SizeOptions } from '../../../../../core/options/SizeOptions.js';
import { getLabelsBounds } from '../../../../../core/util/ElkUtil.js';
import { fuzzyEquals } from '../../../../../guava/DoubleMath.js';
import type { NodeContext } from '../NodeContext.js';
import type { PortContext } from '../PortContext.js';
import { PortPlacementCalculator } from './PortPlacementCalculator.js';

/**
 * The values the fixed ratio loop carries from one port to the next. Java keeps them as locals of the loop's method;
 * they are a record here only so that the loop body can be a separate method (complexity limits).
 */
interface FixedRatioState {
  minWidth: number;
  previousPortContext: PortContext | null;
  previousPortRatio: number;
  previousPortWidth: number;
}

/**
 * Calculates the space required to setup port labels.
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/nodespacing/internal/algorithm/HorizontalPortPlacementSizeCalculator.java
 */
export class HorizontalPortPlacementSizeCalculator {
  /**
   * Fuzzyness allowed to still consider two double values to be equal.
   *
   * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/nodespacing/internal/algorithm/HorizontalPortPlacementSizeCalculator.java:195
   */
  private static readonly EQUALITY_TOLERANCE: number = 0.01;

  /**
   * No instance required.
   */
  private constructor() {}

  /**
   * Calculates the space required for horizontal port placements. If the port placement is not fixed, this will
   * also setup the left and right padding of the inside port label placement cells to reflect the amount of space
   * to be left around the port placement.
   */
  static calculateHorizontalPortPlacementSize(nodeContext: NodeContext): void {
    const self = HorizontalPortPlacementSizeCalculator;

    // We need to calculate the space required by the ports even if ports are not part of the size constraints,
    // since we will use that later to place them
    switch (nodeContext.portConstraints) {
      case PortConstraints.FIXED_POS:
        // We don't have any freedom at all, so simply calculate where the rightmost port is on each side
        self.calculateHorizontalNodeSizeRequiredByFixedPosPorts(nodeContext, PortSide.NORTH);
        self.calculateHorizontalNodeSizeRequiredByFixedPosPorts(nodeContext, PortSide.SOUTH);
        break;

      case PortConstraints.FIXED_RATIO:
        // We can require the node to be large enough to avoid spacing violations with fixed ratio ports
        self.calculateHorizontalNodeSizeRequiredByFixedRatioPorts(nodeContext, PortSide.NORTH);
        self.calculateHorizontalNodeSizeRequiredByFixedRatioPorts(nodeContext, PortSide.SOUTH);
        break;

      default:
        // If we are free to place things, make the node large enough to place everything properly
        self.calculateHorizontalNodeSizeRequiredByFreePorts(nodeContext, PortSide.NORTH);
        self.calculateHorizontalNodeSizeRequiredByFreePorts(nodeContext, PortSide.SOUTH);
        break;
    }
  }

  // ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Fixed Position

  /**
   * Sets up inside port label spaces for fixed position ports. If the node size constraints include ports, we also
   * mess with the cell padding.
   */
  private static calculateHorizontalNodeSizeRequiredByFixedPosPorts(
    nodeContext: NodeContext,
    portSide: PortSide,
  ): void {
    let rightmostPortBorder = 0.0;

    // Check all ports on the correct side
    for (const portContext of nodeContext.portContexts.get(portSide)) {
      rightmostPortBorder = Math.max(rightmostPortBorder, portContext.portPosition.x + portContext.port.getSize().x);
    }

    // Set the cell size and remove left padding since the cell size itself already includes all the space we need
    const cell = nodeContext.insidePortLabelCells.get(portSide)!;
    cell.getPadding().left = 0;
    cell.getMinimumContentAreaSize().x = rightmostPortBorder;
  }

  // ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Fixed Ratio

  /**
   * Sets up inside port label spaces for fixed ratio ports. If the node size constraints include ports, we also
   * mess with the cell padding.
   */
  private static calculateHorizontalNodeSizeRequiredByFixedRatioPorts(
    nodeContext: NodeContext,
    portSide: PortSide,
  ): void {
    const cell = nodeContext.insidePortLabelCells.get(portSide)!;

    // Fetch the port contexts on the given side and abort if there are none
    const portContexts = nodeContext.portContexts.get(portSide);
    if (portContexts.isEmpty()) {
      cell.getPadding().left = 0;
      cell.getPadding().right = 0;
      return;
    }

    // Go over all pairs of consecutive ports
    const state: FixedRatioState = {
      minWidth: 0,
      previousPortContext: null,
      previousPortRatio: 0,
      previousPortWidth: 0,
    };

    for (const currentPortContext of portContexts) {
      HorizontalPortPlacementSizeCalculator.respectSpacingToPreviousPort(
        nodeContext,
        portSide,
        currentPortContext,
        state,
      );
    }

    // if there are right surrounding port margins, apply those as well
    HorizontalPortPlacementSizeCalculator.respectRightSurroundingMargin(nodeContext, state);

    // Set the cell size and remove left padding since the cell size itself already includes all the space we need
    cell.getPadding().left = 0;
    cell.getMinimumContentAreaSize().x = state.minWidth;
  }

  /**
   * The right surrounding port margins section at the end of
   * `calculateHorizontalNodeSizeRequiredByFixedRatioPorts`.
   */
  private static respectRightSurroundingMargin(nodeContext: NodeContext, state: FixedRatioState): void {
    if (nodeContext.surroundingPortMargins !== null && nodeContext.surroundingPortMargins.right > 0) {
      let requiredSpace = state.previousPortWidth + nodeContext.surroundingPortMargins.right;

      // We're only interested in the port's right margin if it's label is placed inside
      if (nodeContext.portLabelsPlacement.contains(PortLabelPlacement.INSIDE)) {
        requiredSpace += state.previousPortContext!.portMargin.right;
      }

      state.minWidth = Math.max(
        state.minWidth,
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
    portSide: PortSide,
    currentPortContext: PortContext,
    state: FixedRatioState,
  ): void {
    // Get the next port and find out things about it
    const currentPortRatio = currentPortContext.port.getProperty(PortPlacementCalculator.PORT_RATIO_OR_POSITION);
    const currentPortWidth = currentPortContext.port.getSize().x;

    // If port labels are to be respected, we need to calculate the port's margins to do so (we ignore the
    // first port in this process if space-efficient mode is active and port labels are to be placed outside)
    if (nodeContext.sizeConstraints.contains(SizeConstraint.PORT_LABELS)) {
      HorizontalPortPlacementSizeCalculator.setupPortMargins(nodeContext, portSide);
    }

    if (state.previousPortContext === null) {
      HorizontalPortPlacementSizeCalculator.respectLeftSurroundingMargin(
        nodeContext,
        currentPortContext,
        state,
        currentPortRatio,
      );
    } else {
      HorizontalPortPlacementSizeCalculator.respectPreviousPort(
        nodeContext,
        currentPortContext,
        state,
        currentPortRatio,
      );
    }

    // Our current port is going to be the previous port during the next iteration
    state.previousPortContext = currentPortContext;
    state.previousPortRatio = currentPortRatio;
    state.previousPortWidth = currentPortWidth;
  }

  /**
   * The first port branch of the loop in `respectSpacingToPreviousPort`.
   */
  private static respectLeftSurroundingMargin(
    nodeContext: NodeContext,
    currentPortContext: PortContext,
    state: FixedRatioState,
    currentPortRatio: number,
  ): void {
    // This is the first port, so find out how wide the node needs to be to respect the left surrounding
    // port margins, if any
    if (nodeContext.surroundingPortMargins !== null && nodeContext.surroundingPortMargins.left > 0) {
      state.minWidth = Math.max(
        state.minWidth,
        HorizontalPortPlacementSizeCalculator.minSizeRequiredToRespectSpacing(
          nodeContext.surroundingPortMargins.left + currentPortContext.portMargin.left,
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
      state.previousPortWidth +
      state.previousPortContext!.portMargin.right +
      nodeContext.portPortSpacing +
      currentPortContext.portMargin.left;
    state.minWidth = Math.max(
      state.minWidth,
      HorizontalPortPlacementSizeCalculator.minSizeRequiredToRespectSpacing(
        requiredSpace,
        state.previousPortRatio,
        currentPortRatio,
      ),
    );
  }

  /**
   * Returns the minimum width that will satisfy the given spacing between the two ratios multiplied by the result
   * width.
   *
   * Package-private in Java (no modifier, `HorizontalPortPlacementSizeCalculator.java:209`): exported for
   * `VerticalPortPlacementSizeCalculator`, which calls it, and for nothing else.
   *
   * @param spacing the spacing to respect.
   * @param firstRatio position ratio of the first element.
   * @param secondRatio position ratio of the second element.
   * @returns minimum width required to satisfy the spacing.
   */
  static minSizeRequiredToRespectSpacing(spacing: number, firstRatio: number, secondRatio: number): number {
    // HorizontalPortPlacementSizeCalculator.java:212 `assert secondRatio >= firstRatio` stays a comment (NS5).

    // Some failsafing
    if (fuzzyEquals(firstRatio, secondRatio, HorizontalPortPlacementSizeCalculator.EQUALITY_TOLERANCE)) {
      return 0;
    } else {
      return spacing / (secondRatio - firstRatio);
    }
  }

  // ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Free

  /**
   * Sets up inside port label spaces for free ports.
   */
  private static calculateHorizontalNodeSizeRequiredByFreePorts(nodeContext: NodeContext, portSide: PortSide): void {
    const cell = nodeContext.insidePortLabelCells.get(portSide)!;

    // Handle the common case first: if there are no ports, set everything to zero
    if (nodeContext.portContexts.get(portSide).isEmpty()) {
      cell.getPadding().left = 0;
      cell.getPadding().right = 0;
      return;
    }

    // Set the padding to match the surrounding port space
    cell.getPadding().left = nodeContext.surroundingPortMargins.left;
    cell.getPadding().right = nodeContext.surroundingPortMargins.right;

    // If we are to take labels into account, we need to setup the port margins such that they include the space
    // required for their labels
    if (nodeContext.sizeConstraints.contains(SizeConstraint.PORT_LABELS)) {
      HorizontalPortPlacementSizeCalculator.setupPortMargins(nodeContext, portSide);
    }

    let width = HorizontalPortPlacementSizeCalculator.portWidthPlusPortPortSpacing(nodeContext, portSide);

    // For distributed port alignment, we need to surround the ports by a port-port spacing on each side
    if (nodeContext.getPortAlignment(portSide) === PortAlignment.DISTRIBUTED) {
      width += 2 * nodeContext.portPortSpacing;
    }

    // Set the cell size
    cell.getMinimumContentAreaSize().x = width;
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

    // Set the horizontal port margins of all ports according to how their labels will be placed. We'll be
    // modifying the margins soon enough.
    HorizontalPortPlacementSizeCalculator.computeHorizontalPortMargins(nodeContext, portSide, portLabelsOutside);

    // The leftmost and rightmost ports are possibly required
    let extremePortContexts: [PortContext, PortContext] | null = null;

    // If port labels are placed outside, there's stuff we can do
    if (portLabelsOutside) {
      extremePortContexts = HorizontalPortPlacementSizeCalculator.trimOutsideMargins(
        portContexts,
        spaceEfficientPortLabels,
      );
    }

    // If ports are placed uniformly, we reflect that here by equalizing all port margins
    if (uniformPortSpacing) {
      HorizontalPortPlacementSizeCalculator.unifyPortMargins(portContexts);

      // Uniforming may have reset the leftmost port's left and rightmost port's right margins
      if (portLabelsOutside) {
        extremePortContexts![0].portMargin.left = 0;
        extremePortContexts![1].portMargin.right = 0;
      }
    }
  }

  /**
   * The outside port labels section of `setupPortMargins`: finds the leftmost and rightmost ports and removes the
   * margins they do not need. Returns the leftmost and the rightmost port context.
   */
  private static trimOutsideMargins(
    portContexts: Iterable<PortContext>,
    spaceEfficientPortLabels: boolean,
  ): [PortContext, PortContext] {
    // Find leftmost and rightmost ports
    const portContextIterator = portContexts[Symbol.iterator]();

    const leftmostPortContext = portContextIterator.next().value as PortContext;
    let rightmostPortContext = leftmostPortContext;

    for (let next = portContextIterator.next(); next.done !== true; next = portContextIterator.next()) {
      rightmostPortContext = next.value;
    }

    // The leftmost and rightmost ports don't need their left and right margin, respectively
    leftmostPortContext.portMargin.left = 0;
    rightmostPortContext.portMargin.right = 0;

    // If we place port labels space-efficiently and the leftmost port doesn't have its label placed right
    // next to it, it doesn't need its right margin either since its label will be placed to its left
    if (spaceEfficientPortLabels && !leftmostPortContext.labelsNextToPort) {
      leftmostPortContext.portMargin.right = 0;
    }

    return [leftmostPortContext, rightmostPortContext];
  }

  /**
   * Sets the horizontal margins of all ports such that they include the space necessary to place their labels.
   */
  private static computeHorizontalPortMargins(
    nodeContext: NodeContext,
    portSide: PortSide,
    _portLabelsOutside: boolean,
  ): void {
    for (const portContext of nodeContext.portContexts.get(portSide)) {
      const labelWidth = portContext.portLabelCell !== null ? portContext.portLabelCell.getMinimumWidth() : 0;

      if (labelWidth > 0) {
        HorizontalPortPlacementSizeCalculator.addLabelWidthToMargins(nodeContext, portContext, labelWidth);
      } else if (PortLabelPlacement.isFixed(nodeContext.portLabelsPlacement)) {
        HorizontalPortPlacementSizeCalculator.addFixedLabelsToMargins(portContext);
      }
    }
  }

  /**
   * The `labelWidth > 0` branch of the loop in `computeHorizontalPortMargins`.
   */
  private static addLabelWidthToMargins(nodeContext: NodeContext, portContext: PortContext, labelWidth: number): void {
    if (portContext.labelsNextToPort) {
      // The label is placed next to the port
      const portWidth = portContext.port.getSize().x;
      if (labelWidth > portWidth) {
        const overhang = (labelWidth - portWidth) / 2;
        portContext.portMargin.left = overhang;
        portContext.portMargin.right = overhang;
      }
    } else {
      // The label is either placed outside (right to the port) or possibly inside, but for a compound
      // node, which means that it is placed right of the port as well to keep it from overlapping with
      // inside edges
      portContext.portMargin.right = nodeContext.portLabelSpacingHorizontal + labelWidth;
    }
  }

  /**
   * The fixed labels branch of the loop in `computeHorizontalPortMargins`.
   */
  private static addFixedLabelsToMargins(portContext: PortContext): void {
    // The fixed port label is not considered with portContext.portLabelCell. Nevertheless, a port margin
    // must be added if necessary.
    const labelsBounds: ElkRectangle = getLabelsBounds(portContext.port);
    if (labelsBounds.x < 0) {
      // Add the part of the label that is on the left of the port to the left margin
      portContext.portMargin.left = -labelsBounds.x;
    }
    if (labelsBounds.x + labelsBounds.width > portContext.port.getSize().x) {
      // Add the part of the label that is on the right of the port to the right margin
      portContext.portMargin.right = labelsBounds.x + labelsBounds.width - portContext.port.getSize().x;
    }
  }

  /**
   * Sets all port margins to be equal to the maximum margins.
   */
  private static unifyPortMargins(portContexts: Iterable<PortContext>): void {
    let maxLeft = 0;
    let maxRight = 0;

    // Find maximum
    for (const portContext of portContexts) {
      maxLeft = Math.max(maxLeft, portContext.portMargin.left);
      maxRight = Math.max(maxRight, portContext.portMargin.right);
    }

    // Apply maximum
    for (const portContext of portContexts) {
      portContext.portMargin.left = maxLeft;
      portContext.portMargin.right = maxRight;
    }
  }

  /**
   * Takes all ports on the given side, sums up their width, and inserts port-port spacings between them. The margins
   * of ports can be included as well to include space used for labels.
   */
  private static portWidthPlusPortPortSpacing(nodeContext: NodeContext, portSide: PortSide): number {
    let result = 0;

    const portContextIterator = nodeContext.portContexts.get(portSide)[Symbol.iterator]();
    let next = portContextIterator.next();
    while (next.done !== true) {
      const portContext = next.value;
      next = portContextIterator.next();

      // Add the current port's width to our result
      result += portContext.portMargin.left + portContext.port.getSize().x + portContext.portMargin.right;

      // If there is another port after this one, include the required spacing
      if (next.done !== true) {
        result += nodeContext.portPortSpacing;
      }
    }

    return result;
  }
}
