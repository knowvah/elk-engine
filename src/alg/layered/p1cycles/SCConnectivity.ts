// SPDX-License-Identifier: EPL-2.0
import * as Iterables from '../../../guava/Iterables.js';
import * as JavaInteger from '../../../java/lang/JavaInteger.js';
import type { LNode } from '../graph/LNode.js';
import { GroupOrderStrategy } from '../options/GroupOrderStrategy.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { GroupModelOrderCalculator } from './GroupModelOrderCalculator.js';
import { SCCModelOrderCycleBreaker } from './SCCModelOrderCycleBreaker.js';

/** The minimum and maximum (group) model order node of a strongly connected component. */
interface MinMax {
  readonly min: LNode;
  readonly max: LNode;
}

/**
 * Based on the SCCModelOrderCycleBreaker. This finds the nodes with minimum and maximum model order and reverses the
 * incoming nodes of the minimum, if its the in-degree is greater than the out-degree of the maximum node. Else it
 * reverses the out-going edges of the maximum node. If group model order should be enforced, this uses the group model
 * order as a primary criterion.
 *
 * <dl>
 *   <dt>Precondition:</dt>
 *      <dd>no self loops</dd>
 *   <dt>Postcondition:</dt>
 *      <dd>the graph has no cycles</dd>
 * </dl>
 *
 * `findNodes` is split at the Java blocks `:56-82` and `:83-98` to stay inside the complexity limits.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p1cycles/SCConnectivity.java
 */
export class SCConnectivity extends SCCModelOrderCycleBreaker {
  override findNodes(offset: number, bigOffset: number): void {
    for (let i = 0; i < this.stronglyConnectedComponents.length; i++) {
      // Nothing needs to be done if only one strongly connected component exists.
      if (this.stronglyConnectedComponents[i]!.size <= 1) {
        continue;
      }
      const { min, max } = this.findMinMax(this.stronglyConnectedComponents[i]!, offset, bigOffset);
      // If the minimum node has more incoming edges than the maximum node has outgoing edges,
      // reverse all edges to the minimum node and remove it from the strongly connected component.
      // If it is the other way around, reverse all outgoing edges of the maximum node.
      if (Iterables.size(min.getIncomingEdges()) > Iterables.size(max.getOutgoingEdges())) {
        for (const edge of min.getIncomingEdges()) {
          if (this.stronglyConnectedComponents[i]!.has(edge.getSource()!.getNode()!)) {
            this.revEdges.push(edge);
          }
        }
      } else {
        for (const edge of max.getOutgoingEdges()) {
          if (this.stronglyConnectedComponents[i]!.has(edge.getTarget()!.getNode()!)) {
            this.revEdges.push(edge);
          }
        }
      }
    }
  }

  /** `:47-82`: iterate over a strongly connected component to find the maximum/minimum node. */
  private findMinMax(component: ReadonlySet<LNode>, offset: number, bigOffset: number): MinMax {
    let min: LNode | null = null;
    let max: LNode | null = null;
    let modelOrderMin = JavaInteger.MAX_VALUE;
    let modelOrderMax = JavaInteger.MIN_VALUE;
    // Check whether model order or the group model order is the primary criterion.
    // If it is group model order, we need to handle this differently.
    const enforceGroupModelOrder =
      this.graph.getProperty(LayeredOptions.CONSIDER_MODEL_ORDER_GROUP_MODEL_ORDER_CB_GROUP_ORDER_STRATEGY) ===
      GroupOrderStrategy.ENFORCED;
    const calculator = new GroupModelOrderCalculator();
    for (const n of component) {
      // First calculate initial values
      if (min === null || max === null) {
        min = n;
        modelOrderMin = this.computeModelOrder(calculator, n, enforceGroupModelOrder, offset, bigOffset);
        max = n;
        modelOrderMax = modelOrderMin;
      } else {
        // For all not first nodes find the group model order and model order with constraints and update the
        // minimum and maximum node.
        const modelOrderCurrent = this.computeModelOrder(calculator, n, enforceGroupModelOrder, offset, bigOffset);
        if (modelOrderMin > modelOrderCurrent) {
          min = n;
          modelOrderMin = modelOrderCurrent;
        }
        if (modelOrderMax < modelOrderCurrent) {
          max = n;
          modelOrderMax = modelOrderCurrent;
        }
      }
    }
    return { min: min!, max: max! };
  }

  /** The conditional expression that the Java loop spells out twice: group model order or model order with constraints. */
  private computeModelOrder(
    calculator: GroupModelOrderCalculator,
    n: LNode,
    enforceGroupModelOrder: boolean,
    offset: number,
    bigOffset: number,
  ): number {
    return enforceGroupModelOrder
      ? calculator.computeConstraintGroupModelOrder(n, bigOffset, offset)
      : calculator.computeConstraintModelOrder(n, offset);
  }
}
