// SPDX-License-Identifier: EPL-2.0
import { PortSide } from '../../../../core/options/PortSide.js';
import { reverse } from '../../../../guava/Lists.js';
import type { LNode } from '../../graph/LNode.js';
import type { LPort } from '../../graph/LPort.js';

/**
 * Utility class for iterating over ports in any direction.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p3order/counting/CrossMinUtil.java
 */
export class CrossMinUtil {
  private constructor() {}

  /**
   * Iterate over ports in north to south and east to west order.
   *
   * @param node whose ports are being considered.
   * @param side of the node we are interested in
   * @returns Iterable for ports on given node and side in given order.
   * @see CrossMinUtil.java:44
   */
  static inNorthSouthEastWestOrder(node: LNode, side: PortSide): Iterable<LPort> {
    switch (side) {
      case PortSide.EAST:
      case PortSide.NORTH:
        return node.getPortSideView(side);
      case PortSide.SOUTH:
      case PortSide.WEST:
        return reverse(node.getPortSideView(side));
    }
    return [];
  }
}
