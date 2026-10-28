// SPDX-License-Identifier: EPL-2.0
import type { KVector } from '../../../core/math/KVector.js';
import { Direction } from '../../../core/options/Direction.js';
import { PortConstraints } from '../../../core/options/PortConstraints.js';
import { PortSide } from '../../../core/options/PortSide.js';
import type { IProperty } from '../../../graph/properties/IProperty.js';
import { GraphProperties } from '../options/GraphProperties.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { PortType } from '../options/PortType.js';
import type { LGraph } from './LGraph.js';
import { getDirection } from './LGraphUtilOther.js';
import type { LNode } from './LNode.js';
import { LPort } from './LPort.js';

/**
 * The "Handling of Ports" section of `LGraphUtil` (`:415-735`) as module functions behind the facade; `LEdge.reverse`
 * calls {@link provideCollectorPort} here directly. Private helpers split at Java blocks for the complexity limits:
 * the end-point block and direction switch of `createPort` ({@link placeNewPort}, {@link addNorthSouthPortProperty}),
 * the direction-dependent criterion of `calcPortSide` ({@link directionalPortSide}), the search loops of
 * `provideCollectorPort` ({@link existingCollectorPort}, {@link newCollectorPort}), and the ratio and anchor blocks of `initializePort`
 * ({@link portRatio}, {@link initializeAnchor}, {@link sideAnchor}). `calcPortSide`, `calcPortOffset` and `centerPoint` are
 * package-private in Java.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/graph/LGraphUtil.java
 */

/**
 * Create a port for an edge that is not connected to a port. This is necessary because ELK Layered wants all edges to
 * have a source port and a target port. The port side is computed from the given absolute end point position of the
 * edge.
 *
 * @param node the node at which the edge is incident
 * @param endPoint the absolute point where the edge ends, or `null` if unknown
 * @param type the port type
 * @param layeredGraph the layered graph
 * @return a new port
 */
export function createPort(node: LNode, endPoint: KVector | null, type: PortType, layeredGraph: LGraph): LPort {
  let port: LPort;
  const direction = getDirection(layeredGraph);
  const mergePorts = layeredGraph.getProperty(LayeredOptions.MERGE_EDGES);

  if (
    (mergePorts || node.getProperty(LayeredOptions.HYPERNODE)) &&
    !node.getProperty(LayeredOptions.PORT_CONSTRAINTS).isSideFixed()
  ) {
    // Hypernodes have one output port and one input port
    const defaultSide = PortSide.fromDirection(direction);
    port = provideCollectorPort(
      layeredGraph,
      node,
      type,
      type === PortType.OUTPUT ? defaultSide : defaultSide.opposed(),
    )!;
  } else {
    port = new LPort();
    port.setNode(node);
    placeNewPort(port, node, endPoint, type, direction);

    addNorthSouthPortProperty(layeredGraph, port.getSide(), direction);
  }

  return port;
}

/** The `if (endPoint != null)` block of {@link createPort}'s `else` branch: position and side of the new port. */
function placeNewPort(port: LPort, node: LNode, endPoint: KVector | null, type: PortType, direction: Direction): void {
  if (endPoint !== null) {
    const pos = port.getPosition();
    pos.x = endPoint.x - node.getPosition().x;
    pos.y = endPoint.y - node.getPosition().y;
    pos.bound(0, 0, node.getSize().x, node.getSize().y);
    port.setSide(calcPortSide(port, direction));
  } else {
    const defaultSide = PortSide.fromDirection(direction);
    port.setSide(type === PortType.OUTPUT ? defaultSide : defaultSide.opposed());
  }
}

/** The `switch (direction)` at the end of {@link createPort}'s `else` branch. */
function addNorthSouthPortProperty(layeredGraph: LGraph, portSide: PortSide, direction: Direction): void {
  const graphProperties = layeredGraph.getProperty(InternalProperties.GRAPH_PROPERTIES);
  switch (direction) {
    case Direction.LEFT:
    case Direction.RIGHT:
      if (portSide === PortSide.NORTH || portSide === PortSide.SOUTH) {
        graphProperties.add(GraphProperties.NORTH_SOUTH_PORTS);
      }
      break;
    case Direction.UP:
    case Direction.DOWN:
      if (portSide === PortSide.EAST || portSide === PortSide.WEST) {
        graphProperties.add(GraphProperties.NORTH_SOUTH_PORTS);
      }
      break;
  }
}

/**
 * Determine the port side for the given port from its relative position at its corresponding node.
 *
 * @param port port to analyze
 * @param direction the overall layout direction
 * @return the port side relative to its containing node
 */
export function calcPortSide(port: LPort, direction: Direction): PortSide {
  const node = port.getNode()!;
  // if the node has zero size, we cannot decide anything
  const nodeWidth = node.getSize().x;
  const nodeHeight = node.getSize().y;
  if (nodeWidth <= 0 && nodeHeight <= 0) {
    return PortSide.UNDEFINED;
  }

  // check direction-dependent criterion
  const xpos = port.getPosition().x;
  const ypos = port.getPosition().y;
  const width = port.getSize().x;
  const height = port.getSize().y;
  const directional = directionalPortSide(port, direction, nodeWidth, nodeHeight);
  if (directional !== null) {
    return directional;
  }

  // check general criterion
  const widthPercent = (xpos + width / 2) / nodeWidth;
  const heightPercent = (ypos + height / 2) / nodeHeight;
  if (widthPercent + heightPercent <= 1 && widthPercent - heightPercent <= 0) {
    // port is on the left
    return PortSide.WEST;
  } else if (widthPercent + heightPercent >= 1 && widthPercent - heightPercent >= 0) {
    // port is on the right
    return PortSide.EAST;
  } else if (heightPercent < 1.0 / 2) {
    // port is on the top
    return PortSide.NORTH;
  } else {
    // port is on the bottom
    return PortSide.SOUTH;
  }
}

/** The `switch (direction)` of {@link calcPortSide}: a side, or `null` to fall through to the general criterion. */
function directionalPortSide(
  port: LPort,
  direction: Direction,
  nodeWidth: number,
  nodeHeight: number,
): PortSide | null {
  const xpos = port.getPosition().x;
  const ypos = port.getPosition().y;
  switch (direction) {
    case Direction.LEFT:
    case Direction.RIGHT:
      if (xpos < 0) {
        return PortSide.WEST;
      } else if (xpos + port.getSize().x > nodeWidth) {
        return PortSide.EAST;
      }
      break;
    case Direction.UP:
    case Direction.DOWN:
      if (ypos < 0) {
        return PortSide.NORTH;
      } else if (ypos + port.getSize().y > nodeHeight) {
        return PortSide.SOUTH;
      }
  }
  return null;
}

/**
 * Compute the offset for a port, that is the amount by which it is moved outside of the node. An offset value of 0
 * means the port has no intersection with the node and touches the outside border of the node.
 *
 * @param port a port
 * @param side the side on the node for the given port
 * @return the offset on the side
 */
export function calcPortOffset(port: LPort, side: PortSide): number {
  const node = port.getNode()!;
  switch (side) {
    case PortSide.NORTH:
      return -(port.getPosition().y + port.getSize().y);
    case PortSide.EAST:
      return port.getPosition().x - node.getSize().x;
    case PortSide.SOUTH:
      return port.getPosition().y - node.getSize().y;
    case PortSide.WEST:
      return -(port.getPosition().x + port.getSize().x);
  }
  return 0;
}

/**
 * Center the given point on one side of a boundary.
 *
 * @param point a point to change
 * @param boundary the boundary to use for centering
 * @param side the side of the boundary
 */
export function centerPoint(point: KVector, boundary: KVector, side: PortSide): void {
  switch (side) {
    case PortSide.NORTH:
      point.x = boundary.x / 2;
      point.y = 0;
      break;
    case PortSide.EAST:
      point.x = boundary.x;
      point.y = boundary.y / 2;
      break;
    case PortSide.SOUTH:
      point.x = boundary.x / 2;
      point.y = boundary.y;
      break;
    case PortSide.WEST:
      point.x = 0;
      point.y = boundary.y / 2;
      break;
  }
}

/**
 * Return a collector port of given type, creating it if necessary. A collector port is used to merge all incident
 * edges that originally had no ports.
 *
 * @param layeredGraph the layered graph
 * @param node a node
 * @param type if `INPUT`, an input collector port is returned; if `OUTPUT`, an output collector port is returned
 * @param side the side to set for a newly created port
 * @return a collector port, or `null` for any other port type
 */
export function provideCollectorPort(_layeredGraph: LGraph, node: LNode, type: PortType, side: PortSide): LPort | null {
  let port: LPort | null = null;
  switch (type) {
    case PortType.INPUT: {
      const inport = existingCollectorPort(node, InternalProperties.INPUT_COLLECT);
      if (inport !== null) {
        return inport;
      }
      port = newCollectorPort(InternalProperties.INPUT_COLLECT);
      break;
    }
    case PortType.OUTPUT: {
      const outport = existingCollectorPort(node, InternalProperties.OUTPUT_COLLECT);
      if (outport !== null) {
        return outport;
      }
      port = newCollectorPort(InternalProperties.OUTPUT_COLLECT);
      break;
    }
  }
  if (port !== null) {
    port.setNode(node);
    port.setSide(side);
    centerPoint(port.getPosition(), node.getSize(), side);
  }
  return port;
}

/** The creation statements of each {@link provideCollectorPort} arm: a new port flagged by `collect`. */
function newCollectorPort(collect: IProperty<boolean>): LPort {
  const port = new LPort();
  port.setProperty(collect, true);
  return port;
}

/** The search loop of each {@link provideCollectorPort} arm: the first port flagged by `collect`, else `null`. */
function existingCollectorPort(node: LNode, collect: IProperty<boolean>): LPort | null {
  for (const port of node.getPorts()) {
    if (port.getProperty(collect)) {
      return port;
    }
  }
  return null;
}

/**
 * Initialize the side, offset, and anchor point of the given port. The port is assumed to be also present in the
 * original graph structure. The port's current position and the size of the corresponding node are used to
 * determine missing values.
 *
 * @param port a port
 * @param portConstraints the port constraints of the containing node
 * @param direction the overall layout direction
 * @param anchorPos the anchor position, or `null` if it shall be determined automatically
 */
export function initializePort(
  port: LPort,
  portConstraints: PortConstraints,
  direction: Direction,
  anchorPos: KVector | null,
): void {
  let portSide = port.getSide();

  if (portSide === PortSide.UNDEFINED && portConstraints.isSideFixed()) {
    // calculate the port side and offset from the port's current position
    portSide = calcPortSide(port, direction);
    port.setSide(portSide);

    // if port coordinates are (0,0), we default to port offset 0 to make the common case
    // frustration-free
    if (
      !port.getAllProperties().containsKey(LayeredOptions.PORT_BORDER_OFFSET) &&
      portSide !== PortSide.UNDEFINED &&
      (port.getPosition().x !== 0 || port.getPosition().y !== 0)
    ) {
      port.setProperty(LayeredOptions.PORT_BORDER_OFFSET, calcPortOffset(port, portSide));
    }
  }

  // if the port constraints are set to fixed ratio, remember the current ratio
  if (portConstraints.isRatioFixed()) {
    port.setProperty(InternalProperties.PORT_RATIO_OR_POSITION, portRatio(port, portSide));
  }

  initializeAnchor(port, portConstraints, portSide, anchorPos);
}

/** The `switch (portSide)` of the fixed-ratio block of {@link initializePort}. */
function portRatio(port: LPort, portSide: PortSide): number {
  let ratio = 0.0;

  switch (portSide) {
    case PortSide.NORTH:
    case PortSide.SOUTH: {
      const nodeWidth = port.getNode()!.getSize().x;
      if (nodeWidth > 0) {
        ratio = port.getPosition().x / nodeWidth;
      }
      break;
    }
    case PortSide.EAST:
    case PortSide.WEST: {
      const nodeHeight = port.getNode()!.getSize().y;
      if (nodeHeight > 0) {
        ratio = port.getPosition().y / nodeHeight;
      }
      break;
    }
  }

  return ratio;
}

/** The anchor block at the end of {@link initializePort}. */
function initializeAnchor(
  port: LPort,
  portConstraints: PortConstraints,
  portSide: PortSide,
  anchorPos: KVector | null,
): void {
  const portSize = port.getSize();
  const portAnchor = port.getAnchor();

  // if the port anchor property is set, use it as anchor point
  if (anchorPos !== null) {
    portAnchor.x = anchorPos.x;
    portAnchor.y = anchorPos.y;

    // Since we have applied an explicit anchor, assume the user knows what they are doing and fix it
    port.setExplicitlySuppliedPortAnchor(true);
  } else if (portConstraints.isSideFixed() && portSide !== PortSide.UNDEFINED) {
    // set the anchor point according to the port side
    sideAnchor(portAnchor, portSize, portSide);
  } else {
    // the port side will be decided later, so set the anchor to the center point
    portAnchor.x = portSize.x / 2;
    portAnchor.y = portSize.y / 2;
  }
}

/** The `switch (portSide)` of {@link initializeAnchor}: the anchor for a fixed side. */
function sideAnchor(portAnchor: KVector, portSize: KVector, portSide: PortSide): void {
  switch (portSide) {
    case PortSide.NORTH:
      portAnchor.x = portSize.x / 2;
      break;
    case PortSide.EAST:
      portAnchor.x = portSize.x;
      portAnchor.y = portSize.y / 2;
      break;
    case PortSide.SOUTH:
      portAnchor.x = portSize.x / 2;
      portAnchor.y = portSize.y;
      break;
    case PortSide.WEST:
      portAnchor.y = portSize.y / 2;
      break;
  }
}
