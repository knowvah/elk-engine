// SPDX-License-Identifier: EPL-2.0
import { PortSide } from '../../../../../core/options/PortSide.js';
import { devAssert } from '../../../../../java/lang/DevAssert.js';
import type { SelfLoopHolder } from '../SelfLoopHolder.js';

/** The three spacings of `computePositions` (Java has them as separate parameters: six exceed the parameter limit). */
type SlotSpacings = {
  readonly edgeEdgeDistance: number;
  readonly edgeLabelDistance: number;
  readonly nodeSelfLoopDistance: number;
};

/**
 * Computes the position of each routing slot on each side, taking care to leave enough space for labels between
 * adjacent routing slots on the north and south sides.
 *
 * This file holds the "Routing Slot Positions" section of `OrthogonalSelfLoopRouter.java` (`:209-308`), moved out of the
 * class for the file size limit: the private methods are module functions with the Java names and bodies (`this` is not
 * used by them). The Java `assert` (`:245`) is a `devAssert` and the `default` arm of `computeBaselinePosition` (Java
 * `assert false; return -1`, `:304`) calls `devAssert(() => false)` and then throws.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/loops/routing/OrthogonalSelfLoopRouter.java
 */
export function computeRoutingSlotPositions(
  slHolder: SelfLoopHolder,
  edgeEdgeDistance: number,
  edgeLabelDistance: number,
  nodeSLDistance: number,
): number[][] {
  // Initialize array
  const positions: number[][] = new Array<number[]>(PortSide.values().length);
  for (const portSide of PortSide.values()) {
    positions[portSide.ordinal()] = new Array<number>(slHolder.getRoutingSlotCount()[portSide.ordinal()]!).fill(0);
  }

  // To know how much space we need to leave between adjacent routing slots, we have to find the size of labels
  // first (for north and south sides, that is)
  initializeWithMaxLabelHeight(positions, slHolder, PortSide.NORTH);
  initializeWithMaxLabelHeight(positions, slHolder, PortSide.SOUTH);

  // Compute the positions for each side
  const spacings: SlotSpacings = { edgeEdgeDistance, edgeLabelDistance, nodeSelfLoopDistance: nodeSLDistance };
  computePositions(positions, slHolder, PortSide.NORTH, spacings);
  computePositions(positions, slHolder, PortSide.EAST, spacings);
  computePositions(positions, slHolder, PortSide.SOUTH, spacings);
  computePositions(positions, slHolder, PortSide.WEST, spacings);

  return positions;
}

/**
 * Initializes the entry for each routing slot on the north or south sides with the maximum height of labels it houses.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/loops/routing/OrthogonalSelfLoopRouter.java
 */
function initializeWithMaxLabelHeight(positions: number[][], slHolder: SelfLoopHolder, portSide: PortSide): void {
  devAssert(() => portSide === PortSide.NORTH || portSide === PortSide.SOUTH);

  const sidePositions = positions[portSide.ordinal()]!;

  for (const slLoop of slHolder.getSLHyperLoops()) {
    const slLabels = slLoop.getSLLabels();
    if (slLabels !== null && slLabels.getSide() === portSide) {
      const routingSlot = slLoop.getRoutingSlot(portSide);
      sidePositions[routingSlot] = Math.max(sidePositions[routingSlot]!, slLabels.getSize().y);
    }
  }
}

/**
 * Computes the positions for each routing slot, taking labels into account.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/loops/routing/OrthogonalSelfLoopRouter.java
 */
function computePositions(
  positions: number[][],
  slHolder: SelfLoopHolder,
  portSide: PortSide,
  spacings: SlotSpacings,
): void {
  const { edgeEdgeDistance, edgeLabelDistance, nodeSelfLoopDistance } = spacings;
  let currPos = computeBaselinePosition(slHolder, portSide, nodeSelfLoopDistance);

  // For northern and western coordinates, we have to subtract from the current position
  const factor = portSide === PortSide.NORTH || portSide === PortSide.WEST ? -1 : 1;

  const sidePositions = positions[portSide.ordinal()]!;
  for (let slot = 0; slot < sidePositions.length; slot++) {
    // The slot entry currently contains the height or width of the largest label in that slot
    let largestLabelSize = sidePositions[slot]!;
    if (largestLabelSize > 0) {
      // Account for label spacing
      largestLabelSize += edgeLabelDistance;
    }

    // Place the slot at the current position and advance the position
    sidePositions[slot] = currPos;
    currPos += factor * (largestLabelSize + edgeEdgeDistance);
  }
}

/**
 * Based on the margin area, this computes the offset from the node origin to add to escape the area occupied by
 * ports.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/loops/routing/OrthogonalSelfLoopRouter.java
 */
function computeBaselinePosition(slHolder: SelfLoopHolder, portSide: PortSide, nodeSelfLoopDistance: number): number {
  const lNode = slHolder.getLNode();
  const lMargins = lNode.getMargin();

  switch (portSide) {
    case PortSide.NORTH:
      return -lMargins.top - nodeSelfLoopDistance;
    case PortSide.EAST:
      return lNode.getSize().x + lMargins.right + nodeSelfLoopDistance;
    case PortSide.SOUTH:
      return lNode.getSize().y + lMargins.bottom + nodeSelfLoopDistance;
    case PortSide.WEST:
      return -lMargins.left - nodeSelfLoopDistance;
    default:
      devAssert(() => false);
      throw new Error(`Unexpected port side ${String(portSide)}`); // Java: assert false; return -1
  }
}
