// SPDX-License-Identifier: EPL-2.0
import type { TGraph } from './graph/TGraph.js';

/**
 * Interface for importer classes for graph structure. Graph importers should usually subclass
 * {@link ElkGraphImporter} instead of implementing this interface directly.
 *
 * Graph importers are encouraged to set the `MrTreeOptions.GRAPH_PROPERTIES` property on imported graphs.
 *
 * @typeParam T the type of graph that this importer can transform into a layered graph.
 * @author sor
 * @author sgu
 * @author msp
 * @see org.eclipse.elk.alg.mrtree/src/org/eclipse/elk/alg/mrtree/IGraphImporter.java
 */
export interface IGraphImporter<T> {
  /**
   * Create a t-graph from the given graph.
   *
   * @param graph the graph to turn into a t-graph
   * @returns a t-graph, or `null` if the input was not recognized
   */
  importGraph(graph: T): TGraph | null;

  /**
   * Apply the computed layout of a t-graph to the original graph.
   *
   * @param tGraph the graph for which layout is applied
   */
  applyLayout(tGraph: TGraph): void;
}
