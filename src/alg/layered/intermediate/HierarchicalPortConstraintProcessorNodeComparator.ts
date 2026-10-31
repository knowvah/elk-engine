// SPDX-License-Identifier: EPL-2.0
import type { LNode } from '../graph/LNode.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import { InternalProperties } from '../options/InternalProperties.js';

/**
 * Comparator to compare nodes by their position values in ascending order. Nodes that are not hierarchical port dummies
 * are sorted to the bottom of a list. Java's private nested `HierarchicalPortConstraintProcessor.NodeComparator` (M15
 * file naming). It is not a consistent order (two non-port nodes compare as `-1` both ways); the Java sorts with it
 * regardless and the comparator stays verbatim.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/HierarchicalPortConstraintProcessor.java:85
 */
export class HierarchicalPortConstraintProcessorNodeComparator {
  /** @see HierarchicalPortConstraintProcessor.java:86 */
  compare(node1: LNode, node2: LNode): number {
    const nodeType1 = node1.getType();
    const nodePos1 = node1.getProperty(InternalProperties.PORT_RATIO_OR_POSITION);
    const nodeType2 = node2.getType();
    const nodePos2 = node2.getProperty(InternalProperties.PORT_RATIO_OR_POSITION);

    if (nodeType2 !== NodeType.EXTERNAL_PORT) {
      return -1;
    } else if (nodeType1 !== NodeType.EXTERNAL_PORT) {
      return 1;
    } else {
      if (nodePos1 === nodePos2) {
        return 0;
      } else {
        return nodePos1 < nodePos2 ? -1 : 1;
      }
    }
  }
}
