// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../../../java/lang/IllegalArgumentException.js';
import type { BaseRoutingDirectionStrategy } from './BaseRoutingDirectionStrategy.js';
import { NorthToSouthRoutingStrategy } from './NorthToSouthRoutingStrategy.js';
import { RoutingDirection } from './RoutingDirection.js';
import { SouthToNorthRoutingStrategy } from './SouthToNorthRoutingStrategy.js';
import { WestToEastRoutingStrategy } from './WestToEastRoutingStrategy.js';

/**
 * Returns an implementation suitable for the given routing direction. This is the Java static method
 * `BaseRoutingDirectionStrategy.forRoutingDirection`; it lives in this module because the three subclasses extend the
 * base class, so a static on the base class would make the base class module import its own subclasses (a cycle that
 * fails with a temporal dead zone error when the base class is the first module loaded).
 *
 * @param direction the direction to return a routing direction strategy for.
 * @returns a suitable strategy.
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/orthogonal/direction/BaseRoutingDirectionStrategy.java:57
 */
export function forRoutingDirection(direction: RoutingDirection): BaseRoutingDirectionStrategy {
  switch (direction) {
    case RoutingDirection.WEST_TO_EAST:
      return new WestToEastRoutingStrategy();
    case RoutingDirection.NORTH_TO_SOUTH:
      return new NorthToSouthRoutingStrategy();
    case RoutingDirection.SOUTH_TO_NORTH:
      return new SouthToNorthRoutingStrategy();
    default:
      throw new IllegalArgumentException();
  }
}
