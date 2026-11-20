// SPDX-License-Identifier: EPL-2.0
import { KVector } from '../../../../../core/math/KVector.js';
import { KVectorChain } from '../../../../../core/math/KVectorChain.js';
import { PortSide } from '../../../../../core/options/PortSide.js';
import { devAssert } from '../../../../../java/lang/DevAssert.js';
import { LGraphUtil } from '../../../graph/LGraphUtil.js';
import { LMargin } from '../../../graph/LMargin.js';
import type { LNode } from '../../../graph/LNode.js';
import type { LPort } from '../../../graph/LPort.js';
import { LayeredOptions } from '../../../options/LayeredOptions.js';
import type { IProperty } from '../../../../../graph/properties/IProperty.js';
import type { SelfHyperLoop } from '../SelfHyperLoop.js';
import type { SelfHyperLoopLabels } from '../SelfHyperLoopLabels.js';
import type { SelfLoopEdge } from '../SelfLoopEdge.js';
import type { SelfLoopHolder } from '../SelfLoopHolder.js';
import type { SelfLoopPort } from '../SelfLoopPort.js';
import { AbstractSelfLoopRouter } from './AbstractSelfLoopRouter.js';
import { EdgeRoutingDirection } from './OrthogonalSelfLoopRouterEdgeRoutingDirection.js';
import { computeRoutingSlotPositions } from './OrthogonalSelfLoopRouterSlotPositions.js';

export { EdgeRoutingDirection };

/** `LGraphUtil.getIndividualOrInherited` unboxed: Java reads the `Double` into a `double`, a missing one is an NPE. */
function spacingOf(lNode: LNode, property: IProperty<number>, what: string): number {
  const value = LGraphUtil.getIndividualOrInherited(lNode, property);
  if (value === null) {
    throw new TypeError(`Cannot unbox the ${what} of a node without one`);
  }
  return value;
}

/** The side and size of the inline label whose space the corner bend points reserve. */
type InlineLabel = { readonly labelSide: PortSide; readonly lSize: KVector };

/**
 * Routes self loops orthogonally. The routing functionality is exposed to subclasses. If a subclass wants to base its
 * routing on the orthogonal routing, it can simply override `modifyBendPoints(SelfLoopEdge, EdgeRoutingDirection,
 * KVectorChain)` to turn an orthogonal routing into some kind of a strange, exotic, exciting new routing style!
 *
 * AD-10 (W6): this class has no hashed container of its own; it iterates `SelfHyperLoop.getSLEdges()` (`:69`), the
 * insertion-ordered `Set` that holds the Java `HashSet` (identity-hashed keys).
 *
 * Deviations: the `default` arms that only assert (`placeLabels`, `addOuterBendPoint`, `getBaseVector`) call
 * `devAssert(() => false)` and then throw (the Java `getBaseVector` would return `null` and fail at the caller). The nested enum lives in its own file (`EdgeRoutingDirection`). Split for
 * the complexity and file size limits: the loop body of `routeSelfLoops` is `routeSelfLoop`; the `switch` of
 * `placeLabels` is `offsetLabels`; the corner loop body of `addCornerBendPoints` is `cornerBendPoint`, its inline label
 * locals are `inlineLabelOf` and the `if` chain on them is `reserveInlineLabelSpace`; the "Routing Slot Positions"
 * section (`:209-308`) is `OrthogonalSelfLoopRouterSlotPositions.ts`. The two overloads of `updateNewNodeMargins` are
 * `updateNewNodeMargins` (bend point) and `updateNewNodeMarginsForLabels`. The stream `forEach` over the bend points is
 * a loop. `addOuterBendPoint` merges the identical NORTH/SOUTH and EAST/WEST arms of its `switch`.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/loops/routing/OrthogonalSelfLoopRouter.java
 */
export class OrthogonalSelfLoopRouter extends AbstractSelfLoopRouter {
  routeSelfLoops(slHolder: SelfLoopHolder): void {
    const lNode: LNode = slHolder.getLNode();

    const nodeSize = lNode.getSize();
    const nodeMargins = lNode.getMargin();

    const edgeEdgeDistance = spacingOf(lNode, LayeredOptions.SPACING_EDGE_EDGE, 'edge-edge spacing');
    const edgeLabelDistance = spacingOf(lNode, LayeredOptions.SPACING_EDGE_LABEL, 'edge-label spacing');
    const nodeSLDistance = spacingOf(lNode, LayeredOptions.SPACING_NODE_SELF_LOOP, 'node self loop spacing');

    const newNodeMargins = new LMargin();
    newNodeMargins.set(nodeMargins);

    // Compute how far away from the node each routing slot on each side is (this takes labels into account)
    const routingSlotPositions = computeRoutingSlotPositions(
      slHolder,
      edgeEdgeDistance,
      edgeLabelDistance,
      nodeSLDistance,
    );

    for (const slLoop of slHolder.getSLHyperLoops()) {
      this.routeSelfLoop(slLoop, nodeSize, newNodeMargins, routingSlotPositions);

      // Place the self loop's labels (the edges were routed such that there is enough space available)
      const slLabels = slLoop.getSLLabels();
      if (slLabels !== null) {
        this.placeLabels(slLoop, slLabels, routingSlotPositions, edgeLabelDistance);
        this.updateNewNodeMarginsForLabels(nodeSize, newNodeMargins, slLabels);
      }
    }

    // Update the node's margins to include the space required for self loops
    nodeMargins.set(newNodeMargins);
  }

  /** The edge loop of the Java `routeSelfLoops` (split out for the complexity limits). */
  private routeSelfLoop(
    slLoop: SelfHyperLoop,
    nodeSize: KVector,
    newNodeMargins: LMargin,
    routingSlotPositions: number[][],
  ): void {
    for (const slEdge of slLoop.getSLEdges()) {
      const lEdge = slEdge.getLEdge();

      const routingDirection = this.computeEdgeRoutingDirection(slEdge);

      // Compute orthogonal bend points and give subclasses a chance to modify them to suit their particular
      // routing style. The default implementation in this class won't change the bend points.
      let bendPoints = this.computeOrthogonalBendPoints(slEdge, routingDirection, routingSlotPositions);
      bendPoints = this.modifyBendPoints(slEdge, routingDirection, bendPoints);

      lEdge.getBendPoints().clear();
      lEdge.getBendPoints().addAll(bendPoints);

      for (const bp of bendPoints) {
        this.updateNewNodeMargins(nodeSize, newNodeMargins, bp);
      }
    }
  }

  /** Computes how the edge reaches its target. */
  private computeEdgeRoutingDirection(slEdge: SelfLoopEdge): EdgeRoutingDirection {
    const sourceLPort = slEdge.getSLSource().getLPort();
    const sourcePortSide = sourceLPort.getSide();

    const targetLPort = slEdge.getSLTarget().getLPort();
    const targetPortSide = targetLPort.getSide();

    if (sourcePortSide === targetPortSide) {
      // If the port sides are equal, it doesn't really matter what we return, but we'll make a best effort based
      // on port IDs
      return sourceLPort.id < targetLPort.id ? EdgeRoutingDirection.CLOCKWISE : EdgeRoutingDirection.COUNTER_CLOCKWISE;
    } else if (sourcePortSide.right() === targetPortSide) {
      return EdgeRoutingDirection.CLOCKWISE;
    } else if (sourcePortSide.left() === targetPortSide) {
      return EdgeRoutingDirection.COUNTER_CLOCKWISE;
    } else {
      devAssert(() => sourcePortSide.opposed() === targetPortSide);

      // What we do here totally depends on the port sides occupied by the self hyper loop. We prefer clockwise
      // routing.
      const slLoop = slEdge.getSLHyperLoop()!;
      if (slLoop.getOccupiedPortSides().contains(sourcePortSide.right())) {
        return EdgeRoutingDirection.CLOCKWISE;
      } else {
        devAssert(() => slLoop.getOccupiedPortSides().contains(sourcePortSide.left()));
        return EdgeRoutingDirection.COUNTER_CLOCKWISE;
      }
    }
  }

  /** Places any labels of the given self loop. */
  private placeLabels(
    slLoop: SelfHyperLoop,
    slLabels: SelfHyperLoopLabels,
    routingSlotPositions: number[][],
    edgeLabelDistance: number,
  ): void {
    // Find the baseline of the routing slot (we need to offset this by the spacing to be left between label and
    // edge)
    const labelSide = slLabels.getSide()!;
    const labelPosition = routingSlotPositions[labelSide.ordinal()]![slLoop.getRoutingSlot(labelSide)]!;
    let inline = false;
    for (const label of slLabels.getLLabels()) {
      if (label.getProperty(LayeredOptions.EDGE_LABELS_INLINE)) {
        inline = true;
        break;
      }
    }
    // Do not use edgeLabelDistance if the labels are inline
    if (inline) {
      edgeLabelDistance = 0;
    }

    this.offsetLabels(slLabels, labelSide, labelPosition, edgeLabelDistance);
  }

  /** The `switch (labelSide)` of the Java `placeLabels` (split out for the complexity limits). */
  private offsetLabels(
    slLabels: SelfHyperLoopLabels,
    labelSide: PortSide,
    labelPosition: number,
    edgeLabelDistance: number,
  ): void {
    switch (labelSide) {
      case PortSide.NORTH:
        labelPosition -= edgeLabelDistance + slLabels.getSize().y;
        slLabels.getPosition().y = labelPosition;
        break;

      case PortSide.SOUTH:
        labelPosition += edgeLabelDistance;
        slLabels.getPosition().y = labelPosition;
        break;

      case PortSide.WEST:
        labelPosition -= edgeLabelDistance + slLabels.getSize().x;
        slLabels.getPosition().x = labelPosition;
        break;

      case PortSide.EAST:
        labelPosition += edgeLabelDistance;
        slLabels.getPosition().x = labelPosition;
        break;

      default:
        devAssert(() => false);
        throw new Error(`Unexpected label side ${String(labelSide)}`); // Java: assert false
    }
  }

  /** Extends the node margins to include the given bend point. */
  private updateNewNodeMargins(nodeSize: KVector, newNodeMargins: LMargin, bendPoint: KVector): void {
    newNodeMargins.left = Math.max(newNodeMargins.left, -bendPoint.x);
    newNodeMargins.right = Math.max(newNodeMargins.right, bendPoint.x - nodeSize.x);

    newNodeMargins.top = Math.max(newNodeMargins.top, -bendPoint.y);
    newNodeMargins.bottom = Math.max(newNodeMargins.bottom, bendPoint.y - nodeSize.y);
  }

  /** Ensures that self loop labels are fully covered by the node margins. */
  private updateNewNodeMarginsForLabels(
    nodeSize: KVector,
    newNodeMargins: LMargin,
    slLabels: SelfHyperLoopLabels,
  ): void {
    const pos = new KVector(slLabels.getPosition());
    this.updateNewNodeMargins(nodeSize, newNodeMargins, pos);

    pos.add(slLabels.getSize());
    this.updateNewNodeMargins(nodeSize, newNodeMargins, pos);
  }

  // ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // High-Level Bend Point Computation

  /** Computes the bend points necessary to route the given self loop edge orthogonally. */
  protected computeOrthogonalBendPoints(
    slEdge: SelfLoopEdge,
    routingDirection: EdgeRoutingDirection,
    routingSlotPositions: number[][],
  ): KVectorChain {
    const bendPoints = new KVectorChain();
    // Make sure that you consider the label size for centering inline.
    this.addOuterBendPoint(slEdge, slEdge.getSLSource(), routingSlotPositions, bendPoints);
    this.addCornerBendPoints(slEdge, routingDirection, routingSlotPositions, bendPoints);
    this.addOuterBendPoint(slEdge, slEdge.getSLTarget(), routingSlotPositions, bendPoints);

    return bendPoints;
  }

  /** Allows subclasses to turn the given list of bend points into a new list of bend points. */
  protected modifyBendPoints(
    _slEdge: SelfLoopEdge,
    _routingDirection: EdgeRoutingDirection,
    bendPoints: KVectorChain,
  ): KVectorChain {
    return bendPoints;
  }

  // ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Actual Bend Point Computation

  private addOuterBendPoint(
    slEdge: SelfLoopEdge,
    slPort: SelfLoopPort,
    routingSlotPositions: number[][],
    bendPoints: KVectorChain,
  ): void {
    const slLoop = slEdge.getSLHyperLoop()!;
    const lPort: LPort = slPort.getLPort();
    const portSide = lPort.getSide();

    // We'll start by computing the coordinate of the level we're on
    const result = this.getBaseVector(portSide, slLoop.getRoutingSlot(portSide), routingSlotPositions);

    // Now take care of the port anchor
    const anchor = lPort.getPosition().clone().add(lPort.getAnchor());
    switch (lPort.getSide()) {
      case PortSide.NORTH:
      case PortSide.SOUTH:
        result.x += anchor.x;
        break;

      case PortSide.EAST:
      case PortSide.WEST:
        result.y += anchor.y;
        break;

      default:
        devAssert(() => false);
        throw new Error(`Unexpected port side ${String(lPort.getSide())}`); // Java: assert false
    }

    bendPoints.add(result);
  }

  private addCornerBendPoints(
    slEdge: SelfLoopEdge,
    routingDirection: EdgeRoutingDirection,
    routingSlotPositions: number[][],
    bendPoints: KVectorChain,
  ): void {
    // Check if we even need corner bend points
    const lSourcePort = slEdge.getSLSource().getLPort();
    const lTargetPort = slEdge.getSLTarget().getLPort();

    if (lSourcePort.getSide() === lTargetPort.getSide()) {
      return;
    }

    const slLoop = slEdge.getSLHyperLoop()!;
    // Use inline labels side and its size to determine the bendpoint offset required to place the label.
    const inlineLabel = this.inlineLabelOf(slEdge, slLoop);

    // Compute corner points
    let currPortSide = lSourcePort.getSide();
    let nextPortSide: PortSide | null = null;

    while (currPortSide !== lTargetPort.getSide()) {
      // Next port side depends on the direction we're going
      nextPortSide = routingDirection === EdgeRoutingDirection.CLOCKWISE ? currPortSide.right() : currPortSide.left();

      bendPoints.add(this.cornerBendPoint(slLoop, [currPortSide, nextPortSide], inlineLabel, routingSlotPositions));

      // Advance to next port side
      currPortSide = nextPortSide;
    }
  }

  /** The body of the corner loop of `addCornerBendPoints` that computes one corner bend point. */
  private cornerBendPoint(
    slLoop: SelfHyperLoop,
    portSides: readonly [PortSide, PortSide],
    inlineLabel: InlineLabel | null,
    routingSlotPositions: number[][],
  ): KVector {
    const [currPortSide, nextPortSide] = portSides;

    // Compute the coordinates contributes by the current and next port sides
    const currPortSideComponent = this.getBaseVector(
      currPortSide,
      slLoop.getRoutingSlot(currPortSide),
      routingSlotPositions,
    );
    const nextPortSideComponent = this.getBaseVector(
      nextPortSide,
      slLoop.getRoutingSlot(nextPortSide),
      routingSlotPositions,
    );
    // If the label is inline, we need to reserve space for each side to accommodate it.
    if (inlineLabel !== null) {
      this.reserveInlineLabelSpace(currPortSide, nextPortSide, inlineLabel, [
        currPortSideComponent,
        nextPortSideComponent,
      ]);
    }

    // One has its x coordinate set, the other has its y coordinate set -- their sum is our final bend point
    return currPortSideComponent.add(nextPortSideComponent);
  }

  /**
   * The Java locals `inline`, `labelSide` and `lSize` of `addCornerBendPoints`, folded into one value: non-null exactly
   * when `inline && labelSide != null && lSize != null` (the condition of the Java `if` in the corner loop).
   */
  private inlineLabelOf(slEdge: SelfLoopEdge, slLoop: SelfHyperLoop): InlineLabel | null {
    let labelSide: PortSide | null = null;
    let lSize: KVector | null = null;
    const inline = slEdge.isInline();
    if (inline && slLoop.getSLLabels() !== null) {
      labelSide = slEdge.getLabelSide();
      lSize = slLoop.getSLLabels()!.getSize();
    }
    return inline && labelSide !== null && lSize !== null ? { labelSide, lSize } : null;
  }

  /** The `if (currPortSide == labelSide) ... else if (nextPortSide == labelSide) ...` of `addCornerBendPoints`. */
  private reserveInlineLabelSpace(
    currPortSide: PortSide,
    nextPortSide: PortSide,
    inlineLabel: InlineLabel,
    components: readonly [KVector, KVector],
  ): void {
    if (currPortSide === inlineLabel.labelSide) {
      this.adjustVectorForLabelSide(components[0], inlineLabel.labelSide, inlineLabel.lSize);
    } else if (nextPortSide === inlineLabel.labelSide) {
      this.adjustVectorForLabelSide(components[1], inlineLabel.labelSide, inlineLabel.lSize);
    }
  }

  private getBaseVector(portSide: PortSide, routingSlot: number, routingSlotPositions: number[][]): KVector {
    const position = routingSlotPositions[portSide.ordinal()]![routingSlot]!;

    switch (portSide) {
      case PortSide.NORTH:
      case PortSide.SOUTH:
        return new KVector(0, position);

      case PortSide.EAST:
      case PortSide.WEST:
        return new KVector(position, 0);

      default:
        devAssert(() => false);
        throw new Error(`Unexpected port side ${String(portSide)}`); // Java: assert false; return null
    }
  }

  /**
   * Adjusts the given vector to account for the label side and size. This is necessary to ensure that the label is
   * centered on the bend point when it is inline with the edge.
   *
   * @param portSideComponent The port side component vector that will be adjusted.
   * @param labelSide The side on which the label is placed.
   * @param labelSize The size of the label.
   */
  private adjustVectorForLabelSide(portSideComponent: KVector, labelSide: PortSide, labelSize: KVector): void {
    switch (labelSide) {
      case PortSide.NORTH:
        portSideComponent.y -= labelSize.y / 2;
        break;
      case PortSide.SOUTH:
        portSideComponent.y += labelSize.y / 2;
        break;
      case PortSide.WEST:
        portSideComponent.x -= labelSize.x / 2;
        break;
      case PortSide.EAST:
        portSideComponent.x += labelSize.x / 2;
        break;
    }
  }
}
