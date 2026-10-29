// SPDX-License-Identifier: EPL-2.0
import * as Int32 from '../../../java/lang/Int32.js';
import * as JavaInteger from '../../../java/lang/JavaInteger.js';
import type { LNode } from '../graph/LNode.js';
import { GroupOrderStrategy } from '../options/GroupOrderStrategy.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { GreedyCycleBreaker } from './GreedyCycleBreaker.js';
import { GroupModelOrderCalculator } from './GroupModelOrderCalculator.js';

/**
 * Greedy Cycle Breaker that behaves the same as {@link GreedyCycleBreaker} but does not randomly choose an edge to
 * reverse if multiple candidates exist but does so by model order.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p1cycles/GreedyModelOrderCycleBreaker.java
 */
export class GreedyModelOrderCycleBreaker extends GreedyCycleBreaker {
  /** Choose the node with the minimum model order. */
  protected override chooseNodeWithMaxOutflow(nodes: readonly LNode[]): LNode {
    let returnNode: LNode | null = null;
    let minimumModelOrder = JavaInteger.MAX_VALUE;
    const offset = Math.max(
      this.layeredGraph.getLayerlessNodes().length,
      this.layeredGraph.getProperty(InternalProperties.MAX_MODEL_ORDER_NODES),
    );
    const bigOffset = Int32.mul(offset, this.layeredGraph.getProperty(InternalProperties.CB_NUM_MODEL_ORDER_GROUPS));
    const moCalculator = new GroupModelOrderCalculator();
    const enforceGroupModelOrder =
      this.layeredGraph.getProperty(LayeredOptions.CONSIDER_MODEL_ORDER_GROUP_MODEL_ORDER_CB_GROUP_ORDER_STRATEGY) ===
      GroupOrderStrategy.ENFORCED;
    for (const node of nodes) {
      // In this step nodes without a model order are disregarded.
      // One could of course think of a different strategy regarding this aspect.
      if (node.hasProperty(InternalProperties.MODEL_ORDER)) {
        const modelOrder = enforceGroupModelOrder
          ? moCalculator.computeConstraintGroupModelOrder(node, bigOffset, offset)
          : moCalculator.computeConstraintModelOrder(node, offset);
        if (minimumModelOrder > modelOrder) {
          minimumModelOrder = modelOrder;
          returnNode = node;
        }
      }
    }
    if (returnNode === null) {
      return super.chooseNodeWithMaxOutflow(nodes);
    }
    return returnNode;
  }
}
