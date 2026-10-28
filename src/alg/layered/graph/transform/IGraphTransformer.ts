// SPDX-License-Identifier: EPL-2.0
import type { LGraph } from '../LGraph.js';

/**
 * Interface for graph transformers that turn a graph into an {@link LGraph} and back.
 *
 * @typeParam T the type of the graph that is transformed
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/graph/transform/IGraphTransformer.java
 */
export interface IGraphTransformer<T> {
  /**
   * Create a layered graph from the given graph.
   *
   * @param graph the graph to turn into a layered graph.
   * @return a layered graph, or `null` if the input was not recognized
   */
  importGraph(graph: T): LGraph | null;

  /**
   * Apply the computed layout of the given layered graph to the original input graph.
   *
   * Precondition: the graph has all its dummy nodes and edges removed; edges that were reversed during layout have
   * been restored to their original orientation. Postcondition: none.
   *
   * @param layeredGraph a graph for which layout is applied
   */
  applyLayout(layeredGraph: LGraph): void;
}
