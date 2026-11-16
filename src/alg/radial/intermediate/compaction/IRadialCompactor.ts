// SPDX-License-Identifier: EPL-2.0
import type { ElkNode } from '../../../../graph/ElkNode.js';

/**
 * An interface for compacting the radial layout.
 *
 * @see org.eclipse.elk.alg.radial/src/org/eclipse/elk/alg/radial/intermediate/compaction/IRadialCompactor.java
 */
export interface IRadialCompactor {
  /** Compacts the graph. `graph` is the graph which is already radial. */
  compact(graph: ElkNode): void;
}
