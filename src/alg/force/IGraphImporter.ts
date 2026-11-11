// SPDX-License-Identifier: EPL-2.0
import type { FGraph } from './graph/FGraph.js';

/**
 * Interface for importer classes for the force graph structure.
 *
 * @typeParam T the type of graph that this importer can transform into a force graph.
 * @author msp
 * @see org.eclipse.elk.alg.force/src/org/eclipse/elk/alg/force/IGraphImporter.java
 */
export interface IGraphImporter<T> {
  /**
   * Create a force graph from the given graph.
   *
   * @param graph the graph to turn into a force graph
   * @returns a force graph, or `null` if the input was not recognized
   */
  importGraph(graph: T): FGraph | null;

  /**
   * Apply the computed layout of a force graph to the original graph.
   *
   * @param forceGraph the graph for which layout is applied
   */
  applyLayout(forceGraph: FGraph): void;
}
