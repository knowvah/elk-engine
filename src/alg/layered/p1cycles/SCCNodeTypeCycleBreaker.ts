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
 * This cycle breaking strategy extends the `SCCModelOrderCycleBreaker`. The preferred node type for the minimum or
 * maximum node can be defined.
 *
 * <dl>
 *   <dt>Precondition:</dt>
 *      <dd>no self loops</dd>
 *   <dt>Postcondition:</dt>
 *      <dd>the graph has no cycles</dd>
 * </dl>
 *
 * `findNodes` is split at the Java blocks `:49-79` and `:80-111` to stay inside the complexity limits; the id
 * comparisons of `:80`, `:88` compare `Integer` boxes in Java (`==`); both operands are property values boxed on their
 * own when the options were parsed, so the port compares them as `Integer.valueOf` boxes: equal only inside the
 * -128..127 cache (E2).
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p1cycles/SCCNodeTypeCycleBreaker.java
 */
export class SCCNodeTypeCycleBreaker extends SCCModelOrderCycleBreaker {
  override findNodes(offset: number, bigOffset: number): void {
    for (let i = 0; i < this.stronglyConnectedComponents.length; i++) {
      // Nothing needs to be done if only one strongly connected component exists.
      if (this.stronglyConnectedComponents[i]!.size <= 1) {
        continue;
      }
      const { min, max } = this.findMinMax(this.stronglyConnectedComponents[i]!, offset, bigOffset);
      this.reverseEdges(this.stronglyConnectedComponents[i]!, min, max);
    }
  }

  /** `:80-111`: choose the edges to reverse by preferred source, preferred target, then connectivity. */
  private reverseEdges(component: ReadonlySet<LNode>, min: LNode, max: LNode): void {
    if (
      JavaInteger.sameValueOfBox(
        min.getProperty(LayeredOptions.CONSIDER_MODEL_ORDER_GROUP_MODEL_ORDER_CYCLE_BREAKING_ID),
        this.graph.getProperty(LayeredOptions.CONSIDER_MODEL_ORDER_GROUP_MODEL_ORDER_CB_PREFERRED_SOURCE_ID),
      )
    ) {
      // If the minimum model order node is a preferred source node, reverse all its incoming edges.
      for (const edge of min.getIncomingEdges()) {
        if (component.has(edge.getSource()!.getNode()!)) {
          this.revEdges.push(edge);
        }
      }
    } else if (
      JavaInteger.sameValueOfBox(
        max.getProperty(LayeredOptions.CONSIDER_MODEL_ORDER_GROUP_MODEL_ORDER_CYCLE_BREAKING_ID),
        this.graph.getProperty(LayeredOptions.CONSIDER_MODEL_ORDER_GROUP_MODEL_ORDER_CB_PREFERRED_TARGET_ID),
      )
    ) {
      // If the maximum model order node is a preferred node reverse all its outgoing edges.
      for (const edge of max.getOutgoingEdges()) {
        if (component.has(edge.getSource()!.getNode()!)) {
          this.revEdges.push(edge);
        }
      }
    } else {
      // Use connectivity to decide.
      this.reverseByConnectivity(component, min, max);
    }
  }

  /** `:97-110`: the connectivity decision. */
  private reverseByConnectivity(component: ReadonlySet<LNode>, min: LNode, max: LNode): void {
    if (Iterables.size(min.getIncomingEdges()) > Iterables.size(max.getOutgoingEdges())) {
      for (const edge of min.getIncomingEdges()) {
        if (component.has(edge.getSource()!.getNode()!)) {
          this.revEdges.push(edge);
        }
      }
    } else {
      for (const edge of max.getOutgoingEdges()) {
        if (component.has(edge.getTarget()!.getNode()!)) {
          this.revEdges.push(edge);
        }
      }
    }
  }

  /** `:45-79`: iterate over a strongly connected component to find the maximum/minimum node. */
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
