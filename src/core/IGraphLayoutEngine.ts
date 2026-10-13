// SPDX-License-Identifier: EPL-2.0
import type { ElkNode } from '../graph/ElkNode.js';
import type { IElkProgressMonitor } from './util/IElkProgressMonitor.js';

/**
 * A graph layout engine is able to perform automatic layout on a graph or parts of it.
 *
 * @author swe
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/IGraphLayoutEngine.java
 */
export interface IGraphLayoutEngine {
  /**
   * Performs layout on the given layout graph.
   *
   * @param layoutGraph the top-level node of the graph to be laid out
   * @param progressMonitor monitor to which progress of the layout algorithms is reported
   * @throws UnsupportedGraphException if the given graph is not supported by this algorithm
   * @throws UnsupportedConfigurationException if the layout configuration included in the graph is
   *     inconsistent or incompatible
   */
  layout(layoutGraph: ElkNode, progressMonitor: IElkProgressMonitor): void;
}
