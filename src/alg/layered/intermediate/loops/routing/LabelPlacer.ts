// SPDX-License-Identifier: EPL-2.0
import type { ILabelManager } from '../../../../../core/labels/ILabelManager.js';
import { PortSide } from '../../../../../core/options/PortSide.js';
import type { IElkProgressMonitor } from '../../../../../core/util/IElkProgressMonitor.js';
import { devAssert } from '../../../../../java/lang/DevAssert.js';
import { LayeredOptions } from '../../../options/LayeredOptions.js';
import { SelfLoopOrderingStrategy } from '../../../options/SelfLoopOrderingStrategy.js';
import { LabelManagementProcessor } from '../../LabelManagementProcessor.js';
import type { SelfHyperLoop } from '../SelfHyperLoop.js';
import { Alignment } from '../SelfHyperLoopLabelsAlignment.js';
import type { SelfHyperLoopLabels } from '../SelfHyperLoopLabels.js';
import type { SelfLoopHolder } from '../SelfLoopHolder.js';
import type { SelfLoopPort } from '../SelfLoopPort.js';
import { SelfLoopType } from '../SelfLoopType.js';

/** Java `Integer.compare`. */
const integerCompare = (a: number, b: number): number => (a < b ? -1 : a === b ? 0 : 1);

/**
 * The northern and southern one-sided loops collected for deferred processing. Java keeps two lists that are `null`
 * unless the ordering strategy is `SEQUENCED`; here the pair is `null` in the same case.
 */
type DeferredLoops = { readonly north: SelfHyperLoop[]; readonly south: SelfHyperLoop[] };

/**
 * Determines where self loop labels will be placed and runs label management, if configured. The placement of each
 * label is described by the port side it will end up on as well as its alignment on that side. For labels assigned to
 * the northern and southern sides, the x coordinate will be computed as well. The same goes for the y coordinate of
 * labels assigned to the eastern and western sides. The other coordinate must be computed by the `SelfLoopRouter`.
 *
 * Deviations: Java `assert` statements are `devAssert` calls. The Java overload `assignSideAndAlignment(SelfLoopHolder)` keeps its name and the four-argument overload is
 * `assignSideAndAlignmentOfLoop` (no overloading by type). The `switch` over the loop type is split into
 * `assignLoopSideAndAlignment` and `assignOneSidedLoop` (complexity limits), the sort of the sequenced case is `sortByLeftmostPortId`, `northernOneSidedSLLoops`/
 * `southernOneSidedSLLoops` travel as one `DeferredLoops` that is `null` exactly when the ordering strategy is not
 * `SEQUENCED`, and the conditional expressions of the opposing/three-sided case are `if`/`else` with the same operands.
 * A `switch` on a null alignment or loop type (Java `NullPointerException`) throws a `TypeError`.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/loops/routing/LabelPlacer.java
 */
export class LabelPlacer {
  /** Places labels for the given {@link SelfLoopHolder}. */
  placeLabels(slHolder: SelfLoopHolder, labelManager: ILabelManager | null, _monitor: IElkProgressMonitor): void {
    this.assignSideAndAlignment(slHolder);

    for (const slLoop of slHolder.getSLHyperLoops()) {
      if (slLoop.getSLLabels() !== null) {
        if (labelManager !== null) {
          this.manageLabels(slLoop, labelManager);
        }

        this.computeCoordinates(slLoop);
      }
    }
  }

  // ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Side and Alignment

  private assignSideAndAlignment(slHolder: SelfLoopHolder): void {
    // Most loops are straightforward, but the one-sides northern and southern ones may not be. If the loops are
    // stacked, we can simply center their labels. If they are sequenced, we want to go from the outer loops to the
    // inner loops in pairs, and align their labels away from each other. To do so, we need to collect all of them
    // first.
    let deferred: DeferredLoops | null = null;

    const orderingStrategy = slHolder.getLNode().getProperty(LayeredOptions.EDGE_ROUTING_SELF_LOOP_ORDERING);
    if (orderingStrategy === SelfLoopOrderingStrategy.SEQUENCED) {
      deferred = { north: [], south: [] };
    }

    // Assign sides and alignments; how this works differs for the different kinds of labels
    for (const slLoop of slHolder.getSLHyperLoops()) {
      // If this loop doesn't have any labels, don't bother
      if (slLoop.getSLLabels() === null) {
        continue;
      }

      devAssert(() => slLoop.getSLLabels()!.getLLabels().length > 0);

      this.assignLoopSideAndAlignment(slLoop, deferred);
    }

    // Process deferred loops
    if (deferred !== null) {
      if (deferred.north.length > 0) {
        this.assignOneSidedSequencedSideAndAlignment(deferred.north, PortSide.NORTH);
      }

      if (deferred.south.length > 0) {
        this.assignOneSidedSequencedSideAndAlignment(deferred.south, PortSide.SOUTH);
      }
    }
  }

  /** The `switch` of the loop in `assignSideAndAlignment` (`:100-132`): how we place labels depends on the loop type. */
  private assignLoopSideAndAlignment(slLoop: SelfHyperLoop, deferred: DeferredLoops | null): void {
    const loopType = slLoop.getSelfLoopType();
    if (loopType === null) {
      // Java: `switch` on a null enum is a NullPointerException
      throw new TypeError('The self loop type of a hyper loop must be determined before placing labels.');
    }

    switch (loopType) {
      case SelfLoopType.ONE_SIDE:
        this.assignOneSidedLoop(slLoop, deferred);
        break;

      case SelfLoopType.TWO_SIDES_CORNER:
        this.assignTwoSidesCornerSideAndAlignment(slLoop);
        break;

      case SelfLoopType.TWO_SIDES_OPPOSING:
      case SelfLoopType.THREE_SIDES:
        this.assignTwoSidesOpposingAndThreeSidesSideAndAlignment(slLoop);
        break;

      case SelfLoopType.FOUR_SIDES:
        this.assignFourSidesSideAndAlignment(slLoop);
        break;

      default:
        devAssert(() => false);
        break;
    }
  }

  /** The `ONE_SIDE` case of the loop type `switch` (`:101-115`). */
  private assignOneSidedLoop(slLoop: SelfHyperLoop, deferred: DeferredLoops | null): void {
    const loopSide = slLoop.getOccupiedPortSides()[Symbol.iterator]().next().value!;

    // `deferred` is non-null exactly if the ordering strategy is SEQUENCED
    if (deferred !== null && loopSide === PortSide.NORTH) {
      // Collect for deferred processing
      deferred.north.push(slLoop);
    } else if (deferred !== null && loopSide === PortSide.SOUTH) {
      // Collect for deferred processing
      deferred.south.push(slLoop);
    } else {
      this.assignOneSidedSimpleSideAndAlignment(slLoop, loopSide);
    }
  }

  /**
   * Side and alignment assignment for those one-sided self loops where the choice is obvious. This is always the
   * case for eastern and western self loops. For northern and southern self loops, this is the case if they are
   * stacked.
   */
  private assignOneSidedSimpleSideAndAlignment(slLoop: SelfHyperLoop, loopSide: PortSide): void {
    // Remove inline edge label property since it is not valid in this case.
    this.removeInlineProperty(slLoop);

    // The alignment depends on the side. For eastern and western loops, we always align to the topmost port.
    // For northern or southern loops, we always center the label.
    switch (loopSide) {
      case PortSide.EAST:
      case PortSide.WEST: {
        // The alignment will be relative to the topmost port (which must be either the leftmost or the rightmost
        // port)
        let topmostPort = slLoop.getLeftmostPort()!;
        if (slLoop.getRightmostPort()!.getLPort().getPosition().y < topmostPort.getLPort().getPosition().y) {
          topmostPort = slLoop.getRightmostPort()!;
        }

        this.assignSideAndAlignmentOfLoop(slLoop, loopSide, Alignment.TOP, topmostPort);
        break;
      }

      case PortSide.NORTH:
      case PortSide.SOUTH:
        this.assignSideAndAlignmentOfLoop(slLoop, loopSide, Alignment.CENTER, null);
        break;

      default:
        devAssert(() => false);
        break;
    }
  }

  private assignOneSidedSequencedSideAndAlignment(slLoops: SelfHyperLoop[], portSide: PortSide): void {
    devAssert(() => slLoops.length > 0);

    // Ensure sensible port IDs
    let id = 0;
    for (const lPort of slLoops[0]!.getSLHolder().getLNode().getPorts()) {
      lPort.id = id++;
    }

    this.sortByLeftmostPortId(slLoops, portSide);

    // Go from outside loops towards inside loops in pairs
    let leftSlLoopIdx = 0;
    let rightSlLoopIdx = slLoops.length - 1;

    while (leftSlLoopIdx < rightSlLoopIdx) {
      const leftSlLoop = slLoops[leftSlLoopIdx]!;
      const rightSlLoop = slLoops[rightSlLoopIdx]!;

      // If the loop is on the northern side, the leftmost port actually is left of the rightmost port. It's
      // flipped for the southern side
      const leftLoopAlignmentReference =
        portSide === PortSide.NORTH ? leftSlLoop.getRightmostPort()! : leftSlLoop.getLeftmostPort()!;
      const rightLoopAlignmentReference =
        portSide === PortSide.NORTH ? rightSlLoop.getLeftmostPort()! : rightSlLoop.getRightmostPort()!;

      this.assignSideAndAlignmentOfLoop(leftSlLoop, portSide, Alignment.RIGHT, leftLoopAlignmentReference);
      this.assignSideAndAlignmentOfLoop(rightSlLoop, portSide, Alignment.LEFT, rightLoopAlignmentReference);

      leftSlLoopIdx++;
      rightSlLoopIdx--;
    }

    // There might be a single loop in the middle
    if (leftSlLoopIdx === rightSlLoopIdx) {
      this.assignSideAndAlignmentOfLoop(slLoops[leftSlLoopIdx]!, portSide, Alignment.CENTER, null);
    }
  }

  /**
   * The sort of `assignOneSidedSequencedSideAndAlignment` (`:176-187`): ascending by the leftmost port ID for the
   * northern side, descending for the southern side.
   */
  private sortByLeftmostPortId(slLoops: SelfHyperLoop[], portSide: PortSide): void {
    // We start by sorting our list according to the ID of the leftmost port. For northern loops, this ensures that
    // the list is sorted from left to right. For southern ports, we need to sort descendingly to have the leftmost
    // port end up at list position 0
    if (portSide === PortSide.NORTH) {
      slLoops.sort((slLoop1, slLoop2) =>
        integerCompare(slLoop1.getLeftmostPort()!.getLPort().id, slLoop2.getLeftmostPort()!.getLPort().id),
      );
    } else {
      slLoops.sort((slLoop1, slLoop2) =>
        integerCompare(slLoop2.getLeftmostPort()!.getLPort().id, slLoop1.getLeftmostPort()!.getLPort().id),
      );
    }
  }

  private assignTwoSidesCornerSideAndAlignment(slLoop: SelfHyperLoop): void {
    // The side and alignment depends on where the leftmost and rightmost port is. If the leftmost port is north,
    // the loop goes towards the eastern side and we can left-align the label on the nortern side. The other cases
    // are similar.
    const leftmostPortSide = slLoop.getLeftmostPort()!.getLPort().getSide();
    const rightmostPortSide = slLoop.getRightmostPort()!.getLPort().getSide();

    // Remove inline edge label property since it is not valid in this case.
    this.removeInlineProperty(slLoop);

    if (leftmostPortSide === PortSide.NORTH) {
      this.assignSideAndAlignmentOfLoop(slLoop, PortSide.NORTH, Alignment.LEFT, slLoop.getLeftmostPort());
    } else if (rightmostPortSide === PortSide.NORTH) {
      this.assignSideAndAlignmentOfLoop(slLoop, PortSide.NORTH, Alignment.RIGHT, slLoop.getRightmostPort());
    } else if (leftmostPortSide === PortSide.SOUTH) {
      this.assignSideAndAlignmentOfLoop(slLoop, PortSide.SOUTH, Alignment.RIGHT, slLoop.getLeftmostPort());
    } else if (rightmostPortSide === PortSide.SOUTH) {
      this.assignSideAndAlignmentOfLoop(slLoop, PortSide.SOUTH, Alignment.LEFT, slLoop.getRightmostPort());
    } else {
      devAssert(() => false);
    }
  }

  private assignTwoSidesOpposingAndThreeSidesSideAndAlignment(slLoop: SelfHyperLoop): void {
    // Where we place our labels depends on the port side not occupied by the self loop. If that is the northern
    // side, for example, the whole southern side is covered and we can center the label there. If it's the western
    // side, on the other hand, we will left-align the label on the northern side.
    const occupiedSides = slLoop.getOccupiedPortSides();
    // Check whether the hyperloop has inline labels
    const hasInlineLabels = this.hasInlineLabels(slLoop);

    if (!occupiedSides.contains(PortSide.NORTH)) {
      // This also works for inline edge labels since the label will be "in the middle".
      this.assignSideAndAlignmentOfLoop(slLoop, PortSide.SOUTH, Alignment.CENTER, null);
    } else if (!occupiedSides.contains(PortSide.SOUTH)) {
      // This also works for inline edge labels since the label will be "in the middle".
      this.assignSideAndAlignmentOfLoop(slLoop, PortSide.NORTH, Alignment.CENTER, null);
    } else if (!occupiedSides.contains(PortSide.WEST)) {
      // If we have inline labels, we can center them on the eastern side. Otherwise, we left-align them on the
      // northern side, which is the default for edge labels.
      if (hasInlineLabels) {
        this.assignSideAndAlignmentOfLoop(slLoop, PortSide.EAST, Alignment.CENTER, null);
      } else {
        this.assignSideAndAlignmentOfLoop(slLoop, PortSide.NORTH, Alignment.LEFT, slLoop.getLeftmostPort());
      }
    } else if (!occupiedSides.contains(PortSide.EAST)) {
      // If we have inline labels, we can center them on the western side. Otherwise, we right-align them on the
      // northern side, which is the default for edge labels.
      if (hasInlineLabels) {
        this.assignSideAndAlignmentOfLoop(slLoop, PortSide.WEST, Alignment.CENTER, null);
      } else {
        this.assignSideAndAlignmentOfLoop(slLoop, PortSide.NORTH, Alignment.RIGHT, slLoop.getRightmostPort());
      }
    } else {
      devAssert(() => false);
    }
  }

  /** Whether any label of the loop has the inline edge label property set (`:210-216`). */
  private hasInlineLabels(slLoop: SelfHyperLoop): boolean {
    for (const label of slLoop.getSLLabels()!.getLLabels()) {
      if (label.getProperty(LayeredOptions.EDGE_LABELS_INLINE)) {
        return true;
      }
    }
    return false;
  }

  /** Removes the inline edge label property of every label of the loop, since it is not valid in these cases. */
  private removeInlineProperty(slLoop: SelfHyperLoop): void {
    for (const label of slLoop.getSLLabels()!.getLLabels()) {
      label.setProperty(LayeredOptions.EDGE_LABELS_INLINE, null);
    }
  }

  private assignFourSidesSideAndAlignment(slLoop: SelfHyperLoop): void {
    // There are basically just two cases that we need to distinguish: the loop covers the whole northern side, or
    // the loop covers the whole southern side. We always center its label on the side that's completely covered.
    // A side is not completely covered if either the leftmost or the rightmost port is placed on that side, so
    // that's easy to distinguish
    const leftmostPortSide = slLoop.getLeftmostPort()!.getLPort().getSide();
    const rightmostPortSide = slLoop.getRightmostPort()!.getLPort().getSide();

    // Remove inline edge label property since it is not valid in this case.
    this.removeInlineProperty(slLoop);

    if (leftmostPortSide === PortSide.NORTH || rightmostPortSide === PortSide.NORTH) {
      this.assignSideAndAlignmentOfLoop(slLoop, PortSide.SOUTH, Alignment.CENTER, null);
    } else {
      this.assignSideAndAlignmentOfLoop(slLoop, PortSide.NORTH, Alignment.CENTER, null);
    }
  }

  /** The Java overload `assignSideAndAlignment(SelfHyperLoop, PortSide, Alignment, SelfLoopPort)` of `:271`. */
  private assignSideAndAlignmentOfLoop(
    slLoop: SelfHyperLoop,
    side: PortSide,
    alignment: Alignment,
    alignmentReference: SelfLoopPort | null,
  ): void {
    const slLabels = slLoop.getSLLabels()!;
    slLabels.setSide(side);
    slLabels.setAlignment(alignment);
    slLabels.setAlignmentReferenceSLPort(alignmentReference);
  }

  // ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Label Management

  private manageLabels(slLoop: SelfHyperLoop, labelManager: ILabelManager): void {
    // How much space we have available depends entirely on our alignment since that also determines whether we're
    // on the north/south or the east/west sides
    const slLabels = slLoop.getSLLabels()!;
    const alignRef = slLabels.getAlignmentReferenceSLPort();

    const lNode = slLoop.getSLHolder().getLNode();
    const lNodeSize = lNode.getSize();
    const lNodeMargins = slLoop.getSLHolder().getLNode().getMargin();

    // targetWidth determines the maximum horizontal space available for label placement.
    // This may be used by LabelManagement to introduce line breaks in the label.
    let targetWidth = 0;

    switch (this.alignmentOf(slLabels)) {
      case Alignment.CENTER:
        // Clip the label to the extent of the node's bounding box
        targetWidth = lNodeMargins.left + lNodeSize.x + lNodeMargins.right;
        break;

      case Alignment.LEFT:
        targetWidth =
          lNodeSize.x - alignRef!.getLPort().getPosition().x - alignRef!.getLPort().getAnchor().x + lNodeMargins.right;
        break;

      case Alignment.RIGHT:
        targetWidth = lNodeMargins.left + alignRef!.getLPort().getPosition().x + alignRef!.getLPort().getAnchor().x;
        break;

      case Alignment.TOP:
        // We have no way of knowing how far to the left / right our self loop will extend on our placement side,
        // so we need a default here
        targetWidth = LabelManagementProcessor.MIN_WIDTH_EDGE_LABELS;
        break;

      default:
        devAssert(() => false);
        break;
    }

    // Make the label fit the target width or whatever the label manager deems necessary to do.
    slLabels.applyLabelManagement(labelManager, Math.max(targetWidth, LabelManagementProcessor.MIN_WIDTH_EDGE_LABELS));
  }

  // ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Coordinate Computation

  private computeCoordinates(slLoop: SelfHyperLoop): void {
    // The coordinates really only depend on the alignment since LEFT, CENTER and RIGHT are specific to the north
    // and south sides while TOP is specific to the east and west sides
    const slLabels = slLoop.getSLLabels()!;

    const alignRef = slLabels.getAlignmentReferenceSLPort();
    const size = slLabels.getSize();
    const pos = slLabels.getPosition();

    switch (this.alignmentOf(slLabels)) {
      case Alignment.CENTER:
        pos.x = (slLoop.getSLHolder().getLNode().getSize().x - size.x) / 2;
        break;

      case Alignment.LEFT:
        pos.x = alignRef!.getLPort().getPosition().x + alignRef!.getLPort().getAnchor().x;
        break;

      case Alignment.RIGHT:
        pos.x = alignRef!.getLPort().getPosition().x + alignRef!.getLPort().getAnchor().x - size.x;
        break;

      case Alignment.TOP:
        pos.y = alignRef!.getLPort().getPosition().y + alignRef!.getLPort().getAnchor().y;
        break;

      default:
        devAssert(() => false);
        break;
    }
  }

  /** The alignment for a `switch`; Java's `switch` on a null alignment is a `NullPointerException`. */
  private alignmentOf(slLabels: SelfHyperLoopLabels): Alignment {
    const alignment = slLabels.getAlignment();
    if (alignment === null) {
      throw new TypeError('The alignment of the self loop labels must be determined before use.');
    }
    return alignment;
  }
}
