// SPDX-License-Identifier: EPL-2.0
import type { NNode } from '../../common/networksimplex/NNode.js';
import type { LNode } from '../graph/LNode.js';

/**
 * The internal representation of a node in the auxiliary graph. Java's nested `NetworkSimplexPlacer.NodeRep` (M15 file
 * naming).
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p4nodes/NetworkSimplexPlacer.java
 */
export class NodeRep {
  origin: LNode;
  /** The 'head' of the node, that is the border with the lower y coordinate. */
  head: NNode;
  /** The 'tail' of a node. That is, the border with the larger y coordinate. */
  tail: NNode;
  /** True if `origin`'s `NodeFlexibility` doesn't equal `NodeFlexibility.NONE`. */
  isFlexible: boolean;

  constructor(origin: LNode, isFlexible: boolean, top: NNode, bottom: NNode) {
    this.origin = origin;
    this.isFlexible = isFlexible;
    this.head = top;
    this.tail = bottom;
  }
}
