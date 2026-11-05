// SPDX-License-Identifier: EPL-2.0
import type { KVector } from '../../../core/math/KVector.js';
import { PortConstraints } from '../../../core/options/PortConstraints.js';
import { PortSide } from '../../../core/options/PortSide.js';
import { compare as doubleCompare } from '../../../java/lang/DoubleCompare.js';
import type { LGraph } from '../graph/LGraph.js';
import { LGraphUtil } from '../graph/LGraphUtil.js';
import type { LNode } from '../graph/LNode.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';

/** The anonymous comparator of `ensureUniquePositions` (`:424`): the dummies' x coordinates, `Double.compare`. */
export const compareByXCoordinate = (a: LNode, b: LNode): number => doubleCompare(a.getPosition().x, b.getPosition().x);

/** The anonymous comparator of `restoreProperOrder` (`:449`): the original ratio or position, `Double.compare`. */
export const compareByRatioOrPosition = (a: LNode, b: LNode): number =>
  doubleCompare(
    a.getProperty(InternalProperties.PORT_RATIO_OR_POSITION),
    b.getProperty(InternalProperties.PORT_RATIO_OR_POSITION),
  );

/** The port anchor's x coordinate, or 0 when there is none (`PORT_ANCHOR` has a null default, as in Java). */
function anchorOffset(dummy: LNode): number {
  const anchor = dummy.getProperty(LayeredOptions.PORT_ANCHOR) as KVector | null;
  return anchor === null ? 0 : anchor.x;
}

/**
 * Set coordinates for northern and southern external port dummy nodes.
 *
 * @param layeredGraph the layered graph.
 * @param northSouthDummies dummy nodes whose position to set.
 * @see HierarchicalPortOrthogonalEdgeRouter.java:283
 */
export function setNorthSouthDummyCoordinates(layeredGraph: LGraph, northSouthDummies: readonly LNode[]): void {
  const constraints = layeredGraph.getProperty(LayeredOptions.PORT_CONSTRAINTS);
  const graphSize = layeredGraph.getSize();
  const graphPadding = layeredGraph.getPadding();
  const graphWidth = graphSize.x + graphPadding.left + graphPadding.right;
  const northY = 0 - graphPadding.top - layeredGraph.getOffset().y;
  const southY = graphSize.y + graphPadding.top + graphPadding.bottom - layeredGraph.getOffset().y;

  // Lists of northern and southern external port dummies
  const northernDummies: LNode[] = [];
  const southernDummies: LNode[] = [];

  for (const dummy of northSouthDummies) {
    // Set x coordinate
    setXCoordinate(constraints, dummy, graphWidth, graphSize);

    // Set y coordinates and add the dummy to its respective list
    switch (dummy.getProperty(InternalProperties.EXT_PORT_SIDE)) {
      case PortSide.NORTH:
        dummy.getPosition().y = northY;
        northernDummies.push(dummy);
        break;

      case PortSide.SOUTH:
        dummy.getPosition().y = southY;
        southernDummies.push(dummy);
        break;
    }
  }

  // Check for correct ordering of nodes in the FIXED_ORDER case and for dummy nodes that have been put on top of one
  // another
  ensureOrderAndUniqueness(constraints, northernDummies, southernDummies, layeredGraph);
}

/**
 * The final switch of {@link setNorthSouthDummyCoordinates} (`:336-347`), split out for the NLOC limit; the cases and
 * their order are Java's.
 *
 * @see HierarchicalPortOrthogonalEdgeRouter.java:336
 */
function ensureOrderAndUniqueness(
  constraints: PortConstraints,
  northernDummies: readonly LNode[],
  southernDummies: readonly LNode[],
  layeredGraph: LGraph,
): void {
  switch (constraints) {
    case PortConstraints.FREE:
    case PortConstraints.FIXED_SIDE:
      ensureUniquePositions(northernDummies, layeredGraph);
      ensureUniquePositions(southernDummies, layeredGraph);
      break;

    case PortConstraints.FIXED_ORDER:
      restoreProperOrder(northernDummies, layeredGraph);
      restoreProperOrder(southernDummies, layeredGraph);
      break;
  }
}

/**
 * The "Set x coordinate" switch of {@link setNorthSouthDummyCoordinates} (`:297-318`), split out for the complexity
 * limit; the cases and their order are Java's.
 *
 * @see HierarchicalPortOrthogonalEdgeRouter.java:297
 */
function setXCoordinate(constraints: PortConstraints, dummy: LNode, graphWidth: number, graphSize: KVector): void {
  switch (constraints) {
    case PortConstraints.FREE:
    case PortConstraints.FIXED_SIDE:
    case PortConstraints.FIXED_ORDER:
      calculateNorthSouthDummyPositions(dummy);
      break;

    case PortConstraints.FIXED_RATIO:
      applyNorthSouthDummyRatio(dummy, graphWidth);
      dummy.borderToContentAreaCoordinates(true, false);
      break;

    case PortConstraints.FIXED_POS:
      applyNorthSouthDummyPosition(dummy);
      dummy.borderToContentAreaCoordinates(true, false);

      // Ensure that the graph is wide enough to hold the port
      graphSize.x = Math.max(graphSize.x, dummy.getPosition().x + dummy.getSize().x / 2.0);
      break;
  }
}

/**
 * Calculates the positions of northern and southern dummy nodes. The position is based on the nodes the dummy nodes
 * are connected to, which is taken as the position of the port's center.
 *
 * @param dummy the northern or southern external port dummy node to calculate the position for.
 * @see HierarchicalPortOrthogonalEdgeRouter.java:357
 */
function calculateNorthSouthDummyPositions(dummy: LNode): void {
  // We use a simple algorithm that simply adds the horizontal positions of all connected ports and divides the sum by
  // the number of connected ports

  // First, get the dummy's port (it has only one)
  const dummyInPort = dummy.getPorts()[0]!;

  // It might be that the node is not actually connected to anything. In that case, we assign a default position
  if (dummyInPort.getDegree() === 0) {
    dummy.getPosition().x = 0;
  } else {
    // Now, iterate over all connected ports, adding their horizontal position
    let posSum = 0.0;

    for (const connectedPort of dummyInPort.getConnectedPorts()) {
      posSum += connectedPort.getNode()!.getPosition().x + connectedPort.getPosition().x + connectedPort.getAnchor().x;
    }

    // Assign the dummy's x coordinate
    dummy.getPosition().x = posSum / dummyInPort.getDegree() - anchorOffset(dummy);
  }
}

/**
 * Sets the dummy's x coordinate to respect the ratio defined for its original port.
 *
 * @param dummy the dummy.
 * @param width the graph width.
 * @see HierarchicalPortOrthogonalEdgeRouter.java:389
 */
function applyNorthSouthDummyRatio(dummy: LNode, width: number): void {
  dummy.getPosition().x = width * dummy.getProperty(InternalProperties.PORT_RATIO_OR_POSITION) - anchorOffset(dummy);
}

/**
 * Sets the dummy's x coordinate to its original port's x coordinate.
 *
 * @param dummy the dummy.
 * @see HierarchicalPortOrthogonalEdgeRouter.java:401
 */
function applyNorthSouthDummyPosition(dummy: LNode): void {
  dummy.getPosition().x = dummy.getProperty(InternalProperties.PORT_RATIO_OR_POSITION) - anchorOffset(dummy);
}

/**
 * Ensures that no two dummy nodes in the given list are assigned the same x coordinate. This method must only be
 * called if port constraints are set to `FREE` or `FIXED_SIDE` as it may not preserve the original order of dummy
 * nodes.
 *
 * @param dummies list of dummy nodes.
 * @param graph the layered graph.
 * @see HierarchicalPortOrthogonalEdgeRouter.java:415
 */
function ensureUniquePositions(dummies: readonly LNode[], graph: LGraph): void {
  if (dummies.length === 0) {
    return;
  }

  // Turn the list into an array of dummy nodes and sort that by their x coordinate (`Arrays.sort` is stable, as is
  // `Array.prototype.sort`)
  const dummyArray = LGraphUtil.toNodeArray(dummies);
  dummyArray.sort(compareByXCoordinate);

  assignAscendingCoordinates(dummyArray, graph);
}

/**
 * Checks if the automatically calculated node coordinates violate their fixed order and fixes the coordinates.
 * Calling this method only makes sense if port constraints are set to `FIXED_ORDER`.
 *
 * @param dummies list of dummy nodes.
 * @param graph the layered graph.
 * @see HierarchicalPortOrthogonalEdgeRouter.java:440
 */
function restoreProperOrder(dummies: readonly LNode[], graph: LGraph): void {
  if (dummies.length === 0) {
    return;
  }

  // Turn the list into an array of dummy nodes and sort that by their original x coordinate
  const dummyArray = LGraphUtil.toNodeArray(dummies);
  dummyArray.sort(compareByRatioOrPosition);

  assignAscendingCoordinates(dummyArray, graph);
}

/**
 * Iterates over the given array of dummy nodes, making sure that their x coordinates are strictly ascending. Dummy
 * nodes whose coordinates are in violation of this rule are moved to the right. Once this method is finished, the
 * coordinates of the dummy nodes reflect their order in the array.
 *
 * @param dummies array of dummy nodes.
 * @param graph the layered graph.
 * @see HierarchicalPortOrthogonalEdgeRouter.java:467
 */
function assignAscendingCoordinates(dummies: readonly LNode[], graph: LGraph): void {
  // Find the port-port spacing
  const spacing = graph.getProperty(LayeredOptions.SPACING_PORT_PORT);

  // Now, iterate over the array, remembering the last assigned position. If we find a position that is less than or
  // equal to the last position, assign a new position of "lastPosition + edgeSpacing"
  const first = dummies[0]!;
  let nextValidCoordinate = first.getPosition().x + first.getSize().x + first.getMargin().right + spacing;

  for (let index = 1; index < dummies.length; index++) {
    const currentPosition = dummies[index]!.getPosition();
    const currentSize = dummies[index]!.getSize();
    const currentMargin = dummies[index]!.getMargin();

    // Ensure spacings are adhered to
    const delta = currentPosition.x - currentMargin.left - nextValidCoordinate;
    if (delta < 0) {
      currentPosition.x -= delta;
    }

    // Ensure the graph is large enough for this node
    const graphSize = graph.getSize();
    graphSize.x = Math.max(graphSize.x, currentPosition.x + currentSize.x);

    // Compute next valid coordinate
    nextValidCoordinate = currentPosition.x + currentSize.x + currentMargin.right + spacing;
  }
}
