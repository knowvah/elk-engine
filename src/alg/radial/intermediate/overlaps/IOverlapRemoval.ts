// SPDX-License-Identifier: EPL-2.0
import type { IElkProgressMonitor } from '../../../../core/util/IElkProgressMonitor.js';
import type { ElkNode } from '../../../../graph/ElkNode.js';

/**
 * Interface for overlap removal strategies.
 *
 * @see org.eclipse.elk.alg.radial/src/org/eclipse/elk/alg/radial/intermediate/overlaps/IOverlapRemoval.java
 */
export interface IOverlapRemoval {
  /** Removes the existing overlaps from the graph, where all nodes are positioned but overlaps may appear. */
  removeOverlaps(graph: ElkNode, progressMonitor: IElkProgressMonitor): void;
}
