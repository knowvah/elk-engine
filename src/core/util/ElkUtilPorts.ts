// SPDX-License-Identifier: EPL-2.0
/**
 * `ElkUtil` port helpers: `calcPortSide` and `calcPortOffset` (M10 section module of `ElkUtil.ts`).
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/ElkUtil.java
 */
import type { ElkNode } from '../../graph/ElkNode.js';
import type { ElkPort } from '../../graph/ElkPort.js';
import { IllegalStateException } from '../../java/lang/IllegalStateException.js';
import { CoreOptions } from '../options/CoreOptions.js';
import { Direction } from '../options/Direction.js';
import { PortSide } from '../options/PortSide.js';

const NO_PARENT_MESSAGE = 'port must have a parent node to calculate the port side';
const HALF = 0.5;

/** The parent's layout direction, or the node's own for a root node. */
export function layoutDirectionOf(node: ElkNode): Direction {
  const parent = node.getParent();
  return parent === null ? node.getProperty(CoreOptions.DIRECTION) : parent.getProperty(CoreOptions.DIRECTION);
}

/** The port's parent node; Java throws `IllegalStateException` for a port without one. */
function parentOf(port: ElkPort): ElkNode {
  const node = port.getParent();
  if (node === null) {
    throw new IllegalStateException(NO_PARENT_MESSAGE);
  }
  return node;
}

/**
 * The direction-dependent criterion of `calcPortSide` (the Java `switch (direction)`), or `UNDEFINED` when it
 * does not decide.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/ElkUtil.java
 */
function calcPortSideByDirection(port: ElkPort, node: ElkNode, direction: Direction): PortSide {
  const xpos = port.getX();
  const ypos = port.getY();
  if (direction === Direction.LEFT || direction === Direction.RIGHT) {
    if (xpos < 0) {
      return PortSide.WEST;
    } else if (xpos + port.getWidth() > node.getWidth()) {
      return PortSide.EAST;
    }
  } else if (direction === Direction.UP || direction === Direction.DOWN) {
    if (ypos < 0) {
      return PortSide.NORTH;
    } else if (ypos + port.getHeight() > node.getHeight()) {
      return PortSide.SOUTH;
    }
  }
  return PortSide.UNDEFINED;
}

/**
 * Determines the port side for the given port from its relative position at its corresponding node.
 *
 * @param port port to analyze
 * @param direction the overall layout direction
 * @returns the port side relative to its containing node
 * @throws IllegalStateException if the port does not have a parent node.
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/ElkUtil.java
 */
export function calcPortSide(port: ElkPort, direction: Direction): PortSide {
  const node = parentOf(port);

  // if the node has zero size, we cannot decide anything
  const nodeWidth = node.getWidth();
  const nodeHeight = node.getHeight();
  if (nodeWidth <= 0 && nodeHeight <= 0) {
    return PortSide.UNDEFINED;
  }

  // check direction-dependent criterion
  const bySwitch = calcPortSideByDirection(port, node, direction);
  if (bySwitch !== PortSide.UNDEFINED) {
    return bySwitch;
  }

  // check general criterion
  const widthPercent = (port.getX() + port.getWidth() / 2) / nodeWidth;
  const heightPercent = (port.getY() + port.getHeight() / 2) / nodeHeight;
  if (widthPercent + heightPercent <= 1 && widthPercent - heightPercent <= 0) {
    // port is on the left
    return PortSide.WEST;
  } else if (widthPercent + heightPercent >= 1 && widthPercent - heightPercent >= 0) {
    // port is on the right
    return PortSide.EAST;
  } else if (heightPercent < HALF) {
    // port is on the top
    return PortSide.NORTH;
  } else {
    // port is on the bottom
    return PortSide.SOUTH;
  }
}

/**
 * Calculate the offset for a port, that is the amount by which it is moved outside of the node. An offset value
 * of 0 means the port has no intersection with the node and touches the outside border of the node.
 *
 * @param port a port
 * @param side the side on the node for the given port
 * @returns the offset on the side
 * @throws IllegalStateException if the port does not have a parent node.
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/ElkUtil.java
 */
export function calcPortOffset(port: ElkPort, side: PortSide): number {
  const node = parentOf(port);
  switch (side) {
    case PortSide.NORTH:
      return -(port.getY() + port.getHeight());
    case PortSide.EAST:
      return port.getX() - node.getWidth();
    case PortSide.SOUTH:
      return port.getY() - node.getHeight();
    case PortSide.WEST:
      return -(port.getX() + port.getWidth());
    default:
      return 0;
  }
}

/** The port's side, decided from its position (and stored on the port) while it is still `UNDEFINED`. */
export function resolvePortSide(port: ElkPort, direction: Direction): PortSide {
  let portSide = port.getProperty(CoreOptions.PORT_SIDE);
  if (portSide === PortSide.UNDEFINED) {
    portSide = calcPortSide(port, direction);
    port.setProperty(CoreOptions.PORT_SIDE, portSide);
  }
  return portSide;
}
