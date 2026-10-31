// SPDX-License-Identifier: EPL-2.0
import { toString as doubleToString } from '../../../java/lang/DoubleToString.js';
import type { LNode } from '../graph/LNode.js';

/**
 * Represents the current barycenter state of a node. Java's nested `BarycenterHeuristic.BarycenterState` (M15 file
 * naming).
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p3order/BarycenterHeuristic.java:272
 */
export class BarycenterHeuristicBarycenterState {
  /** The node this state holds data for. */
  node: LNode;
  /**
   * The sum of the node weights. Each node weight is the sum of the weights of the ports the node's ports are
   * connected to.
   */
  summedWeight = 0;
  /** The number of ports relevant to the barycenter calculation. */
  degree = 0;
  /** This vertex' barycenter value. (summedWeight / degree) A Java `Double`, so `null` is "undefined". */
  barycenter: number | null = null;
  /** Whether the node group has been visited in some traversing algorithm. */
  visited = false;

  /**
   * @param node the node this state holds data for.
   */
  constructor(node: LNode) {
    this.node = node;
  }

  toString(): string {
    return (
      `BarycenterState [node=${this.node.toString()}, summedWeight=${doubleToString(this.summedWeight)}, ` +
      `degree=${String(this.degree)}, barycenter=${this.barycenter === null ? 'null' : doubleToString(this.barycenter)}, ` +
      `visited=${String(this.visited)}]`
    );
  }
}
