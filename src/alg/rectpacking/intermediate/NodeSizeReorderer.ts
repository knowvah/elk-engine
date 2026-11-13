// SPDX-License-Identifier: EPL-2.0
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import { ECollections } from '../../../emf/common/util/ECollections.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { NodeSizeComparator } from './NodeSizeComparator.js';

/**
 * Sorts all child nodes by their sizes from largest to smallest while preserving any existing ordering.
 *
 * <dl>
 *   <dt>Precondition:</dt>
 *   <dt>Postcondition:</dt>
 *     <dd>Children are sorted in descending order from largest to smallest.</dd>
 *   <dt>Slots:</dt>
 *     <dd>Before phase 1.</dd>
 *   <dt>Same-slot dependencies:</dt>
 *     <dd>Before Interactive Node Reorderer</dd>
 * </dl>
 *
 * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/intermediate/NodeSizeReorderer.java
 */
export class NodeSizeReorderer implements ILayoutProcessor<ElkNode> {
  /** @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/intermediate/NodeSizeReorderer.java */
  process(graph: ElkNode, _progressMonitor: IElkProgressMonitor): void {
    const comparator = new NodeSizeComparator();
    ECollections.sort(graph.getChildren(), (a, b) => comparator.compare(a, b));
  }
}
