// SPDX-License-Identifier: EPL-2.0
import { Direction } from '../../../core/options/Direction.js';
import { PortSide } from '../../../core/options/PortSide.js';

/**
 * Java's private `ComponentsCompactor.portSideToDirection`, shared with the nested types (the Java inner
 * classes call the outer instance method; it uses no state).
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/components/ComponentsCompactor.java:571
 */
export function portSideToDirection(side: PortSide): Direction {
  if (side === PortSide.NORTH) {
    return Direction.UP;
  } else if (side === PortSide.WEST) {
    return Direction.LEFT;
  } else if (side === PortSide.EAST) {
    return Direction.RIGHT;
  } else if (side === PortSide.SOUTH) {
    return Direction.DOWN;
  }
  return Direction.UNDEFINED;
}
