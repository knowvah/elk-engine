// SPDX-License-Identifier: EPL-2.0
import { compare } from '../../../java/lang/DoubleCompare.js';
import type { ElkNode } from '../../../graph/ElkNode.js';

/**
 * Node size comparator to compare nodes by their height.
 *
 * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/intermediate/NodeSizeComparator.java
 */
export class NodeSizeComparator {
  /** @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/intermediate/NodeSizeComparator.java */
  compare(node0: ElkNode, node1: ElkNode): number {
    return compare(node1.getHeight(), node0.getHeight());
  }
}
