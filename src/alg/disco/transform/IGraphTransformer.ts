// SPDX-License-Identifier: EPL-2.0
import type { DCGraph } from '../graph/DCGraph.js';

/**
 * Interface for transforming any graph structure into a {@link DCGraph}, in order to use layout algorithms provided by
 * DisCo for compacting disconnected components of the given graph.
 *
 * @typeParam G the graph structure to transform
 * @see alg.disco/src/org/eclipse/elk/alg/disco/transform/IGraphTransformer.java
 */
export interface IGraphTransformer<G> {
  /**
   * Transforms the given graph into a {@link DCGraph}.
   *
   * @param graph the graph to transform
   * @returns the transformed graph
   */
  importGraph(graph: G): DCGraph;

  /**
   * Applies the changes made to its associated {@link DCGraph} back to the original graph (presumably after a layout
   * algorithm has been used).
   */
  applyLayout(): void;
}
