// SPDX-License-Identifier: EPL-2.0
import type { NEdge } from '../../common/networksimplex/NEdge.js';
import type { NNode } from '../../common/networksimplex/NNode.js';
import type { LEdge } from '../graph/LEdge.js';

/**
 * The internal representation of an edge in the auxiliary graph. Java's nested `NetworkSimplexPlacer.EdgeRep` (M15 file
 * naming).
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p4nodes/NetworkSimplexPlacer.java
 */
export class EdgeRep {
  origin: LEdge;
  left: NEdge;
  right: NEdge;

  /** The Java constructor takes the `dummy` node as well and ignores it. */
  constructor(origin: LEdge, _dummy: NNode, left: NEdge, right: NEdge) {
    this.origin = origin;
    this.left = left;
    this.right = right;
  }

  /**
   * @return `true` if the edge's source and the edge's target have the same y coordinate. `false` otherwise.
   */
  isStraight(): boolean {
    return this.notStraightBy() === 0;
  }

  /**
   * @return an integer value indication the y coordinate difference between the edge's source and the edge's target.
   *         A positive value indicates that the source has a larger y coordinate than the target; a negative value
   *         that it has a lower y coordinate; zero that the edge is straight.
   */
  notStraightBy(): number {
    return this.left.target!.layer - this.left.delta - (this.right.target!.layer - this.right.delta);
  }
}
