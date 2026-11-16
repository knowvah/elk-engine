// SPDX-License-Identifier: EPL-2.0
import type { DCGraph } from './graph/DCGraph.js';

/**
 * Interface for algorithms geared towards compacting the connected components of {@link DCGraph DCGraphs}.
 *
 * @see alg.disco/src/org/eclipse/elk/alg/disco/ICompactor.java
 */
export interface ICompactor {
  /**
   * Compacts the connected components of a {@link DCGraph}. Sets an offset field of each `DCComponent`, i.e. a vector
   * relative to the absolute position of each component before compaction. Moreover sets a field of the
   * {@link DCGraph} containing the dimensions of a minimum bounding box able to depict the whole resulting graph.
   *
   * The values of these fields are later going to be used in a class implementing `IGraphTransformer` to apply the
   * resulting layout to the original graph structure the {@link DCGraph} was created from.
   *
   * @param graph DCGraph to compact
   */
  compact(graph: DCGraph): void;
}
