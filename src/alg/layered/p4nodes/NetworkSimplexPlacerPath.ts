// SPDX-License-Identifier: EPL-2.0
import type { LEdge } from '../graph/LEdge.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import { NodeFlexibility } from '../options/NodeFlexibility.js';
import { IllegalStateException } from '../../../java/lang/IllegalStateException.js';
import { isFlexibleNode } from './NetworkSimplexPlacerFlexibleNode.js';

/**
 * Convenience class, basically a type def for `ArrayList<LEdge>`. Java's nested `NetworkSimplexPlacer.Path extends
 * ArrayList<LEdge>`: a class over an array with the members the Java uses (`add`, `get`, `size`, `isEmpty`, `clear`,
 * iteration) and the four path methods.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p4nodes/NetworkSimplexPlacer.java
 */
export class Path implements Iterable<LEdge> {
  readonly #edges: LEdge[] = [];

  add(edge: LEdge): void {
    this.#edges.push(edge);
  }

  get(index: number): LEdge {
    return this.#edges[index]!;
  }

  size(): number {
    return this.#edges.length;
  }

  isEmpty(): boolean {
    return this.#edges.length === 0;
  }

  clear(): void {
    this.#edges.length = 0;
  }

  [Symbol.iterator](): Iterator<LEdge> {
    return this.#edges[Symbol.iterator]();
  }

  /**
   * @return `true` if any node in this path is of type `NodeType.LONG_EDGE`. `false` otherwise.
   */
  containsLongEdgeDummy(): boolean {
    if (this.isEmpty()) {
      return false;
    }
    if (this.get(0).getSource()!.getNode()!.getType() === NodeType.LONG_EDGE) {
      return true;
    }
    return this.#edges.map((e) => e.getTarget()!.getNode()!.getType()).some((t) => t === NodeType.LONG_EDGE);
  }

  /**
   * @return `true` is any node of this path fulfills the passed predicate `p`.
   */
  containsFlexibleNode(p: (nf: NodeFlexibility) => boolean): boolean {
    if (this.isEmpty()) {
      return false;
    }
    const nf = NodeFlexibility.getNodeFlexibility(this.get(0).getSource()!.getNode()!);
    if (p(nf)) {
      return true;
    }
    return this.#edges.map((e) => e.getTarget()!.getNode()!).some((n) => p(NodeFlexibility.getNodeFlexibility(n)));
  }

  /**
   * Orders the two edges of this path such that the shared node is the target of the first edge and the source of the
   * second edge.
   */
  orderTwoPath(): void {
    if (this.size() !== 2) {
      throw new IllegalStateException('Order only allowed for two paths.');
    }
    const first = this.get(0);
    const second = this.get(1);
    if (first.getTarget()!.getNode() !== second.getSource()!.getNode()) {
      this.clear();
      this.add(second);
      this.add(first);
    }
  }

  /**
   * @return `true` if the target node of the first edge is flexible (`isFlexibleNode`). Call this method only if the
   *         path is ordered, see `orderTwoPath`.
   */
  isTwoPathCenterNodeFlexible(): boolean {
    return isFlexibleNode(this.get(0).getTarget()!.getNode()!);
  }
}
