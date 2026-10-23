// SPDX-License-Identifier: EPL-2.0
import type { IElkProgressMonitor } from '../util/IElkProgressMonitor.js';

/**
 * Interface for a processor that does some part of a layout algorithm's work on a graph.
 *
 * @typeParam G type of the graph the processor works on
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/alg/ILayoutProcessor.java
 */
export interface ILayoutProcessor<G> {
  /**
   * Performs the processor's work on the given graph.
   *
   * @param graph the graph to process
   * @param progressMonitor a progress monitor to indicate progress with
   */
  process(graph: G, progressMonitor: IElkProgressMonitor): void;
}
