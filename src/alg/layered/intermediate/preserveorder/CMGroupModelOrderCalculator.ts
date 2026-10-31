// SPDX-License-Identifier: EPL-2.0
import type { LGraph } from '../../graph/LGraph.js';
import type { LGraphElement } from '../../graph/LGraphElement.js';
import { GroupOrderStrategy } from '../../options/GroupOrderStrategy.js';
import { InternalProperties } from '../../options/InternalProperties.js';
import { LayeredOptions } from '../../options/LayeredOptions.js';
import * as Int32 from '../../../../java/lang/Int32.js';

/**
 * Helper class to calculate the model order and group model order for crossing minimization.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/preserveorder/CMGroupModelOrderCalculator.java
 */
export class CMGroupModelOrderCalculator {
  /**
   * @see CMGroupModelOrderCalculator.java:30
   */
  static calculateModelOrderOrGroupModelOrder(
    element: LGraphElement,
    other: LGraphElement,
    parent: LGraph,
    offset: number,
  ): number {
    const groupId = LayeredOptions.CONSIDER_MODEL_ORDER_GROUP_MODEL_ORDER_CROSSING_MINIMIZATION_ID;
    const enforceGroupModelOrder =
      parent.getProperty(LayeredOptions.CONSIDER_MODEL_ORDER_GROUP_MODEL_ORDER_CM_GROUP_ORDER_STRATEGY) ===
      GroupOrderStrategy.ENFORCED;
    const enforcedOrders = parent.getProperty(
      LayeredOptions.CONSIDER_MODEL_ORDER_GROUP_MODEL_ORDER_CM_ENFORCED_GROUP_ORDERS,
    );
    if (!element.hasProperty(InternalProperties.MODEL_ORDER)) {
      return -1;
    } else if (enforceGroupModelOrder) {
      // Check whether the order between both is enforced. Otherwise use model order.
      // `List<Integer>.contains` is `equals`: value equality of the unboxed ids (C6: no `==` on boxes here).
      if (
        enforcedOrders.includes(element.getProperty(groupId)) &&
        enforcedOrders.includes(other.getProperty(groupId))
      ) {
        // This means that we need to calculate the model order by groupId * number of nodes/port/edges + real model order.
        return Int32.add(
          Int32.mul(offset, element.getProperty(groupId)),
          element.getProperty(InternalProperties.MODEL_ORDER),
        );
      }
      // Fallthrough case
    } else {
      // Case only model order.
      return element.getProperty(InternalProperties.MODEL_ORDER);
    }
    return element.getProperty(InternalProperties.MODEL_ORDER);
  }
}
