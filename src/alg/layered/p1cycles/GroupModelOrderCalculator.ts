// SPDX-License-Identifier: EPL-2.0
import * as Int32 from '../../../java/lang/Int32.js';
import type { LNode } from '../graph/LNode.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayerConstraint } from '../options/LayerConstraint.js';
import { LayeredOptions } from '../options/LayeredOptions.js';

/**
 * Helper class to calculate the model order and group model order. Needs to be reset to reuse it.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p1cycles/GroupModelOrderCalculator.java
 */
export class GroupModelOrderCalculator {
  /** Counts how many first separate nodes occurred. */
  private firstSeparateNodes = 0;
  /** Counts how many last separate nodes occurred. */
  private lastSeparateNodes = 0;

  /**
   * Set model order to a value such that the constraint is respected and the ordering between nodes with the same
   * constraint is preserved. The order should be FIRST_SEPARATE < FIRST < NORMAL < LAST < LAST_SEPARATE. The offset is
   * used to make sure the all nodes have unique model orders.
   *
   * @param node The LNode
   * @param offset The offset between FIRST, FIRST_SEPARATE, NORMAL, LAST_SEPARATE, and LAST nodes for unique order
   * @return A unique model order
   */
  computeConstraintModelOrder(node: LNode, offset: number): number {
    let modelOrder = this.constraintOffset(node, offset);
    if (node.hasProperty(InternalProperties.MODEL_ORDER)) {
      modelOrder = Int32.add(modelOrder, node.getProperty(InternalProperties.MODEL_ORDER));
    }
    return modelOrder;
  }

  /**
   * Set group model order to a value such that the constraint is respected and the ordering between nodes with the
   * same constraint is preserved. The order should be FIRST_SEPARATE < FIRST < NORMAL < LAST < LAST_SEPARATE. The
   * offset is used to make sure the all nodes have unique group model orders. We calculate this offset by "highest
   * model order * number of model order groups" and the small offset by using only the highest model order.
   *
   * @param node The LNode
   * @param offset The offset between FIRST, FIRST_SEPARATE, NORMAL, LAST_SEPARATE, and LAST nodes for unique order
   * @param smallOffset The offset between each model order group.
   * @return A unique group model order
   */
  computeConstraintGroupModelOrder(node: LNode, offset: number, smallOffset: number): number {
    let modelOrder = this.constraintOffset(node, offset);
    if (node.hasProperty(InternalProperties.MODEL_ORDER)) {
      const groupId = node.getProperty(LayeredOptions.CONSIDER_MODEL_ORDER_GROUP_MODEL_ORDER_CYCLE_BREAKING_ID);
      modelOrder = Int32.add(
        modelOrder,
        Int32.add(Int32.mul(groupId, smallOffset), node.getProperty(InternalProperties.MODEL_ORDER)),
      );
    }
    return modelOrder;
  }

  /**
   * The `switch` on the layer constraint that both Java methods repeat (`:47-64`, `:85-102`); it is shared here to stay
   * inside the complexity limits, with the counters bumped exactly as there.
   */
  private constraintOffset(node: LNode, offset: number): number {
    let modelOrder = 0;
    switch (node.getProperty(LayeredOptions.LAYERING_LAYER_CONSTRAINT)) {
      case LayerConstraint.FIRST_SEPARATE:
        modelOrder = Int32.add(Int32.mul(2, Int32.neg(offset)), this.firstSeparateNodes);
        this.firstSeparateNodes++;
        break;
      case LayerConstraint.FIRST:
        modelOrder = Int32.neg(offset);
        break;
      case LayerConstraint.LAST:
        modelOrder = offset;
        break;
      case LayerConstraint.LAST_SEPARATE:
        modelOrder = Int32.add(Int32.mul(2, offset), this.lastSeparateNodes);
        this.lastSeparateNodes++;
        break;
      default:
        break;
    }
    return modelOrder;
  }

  resetInternalCounters(): void {
    this.firstSeparateNodes = 0;
    this.lastSeparateNodes = 0;
  }
}
