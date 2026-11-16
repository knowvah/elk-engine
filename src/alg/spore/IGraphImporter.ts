// SPDX-License-Identifier: EPL-2.0
import type { Graph } from './graph/Graph.js';

/**
 * Interface for importer classes for graph structure.
 *
 * @typeParam T the type of graph that this importer can transform into a Graph.
 * @see org.eclipse.elk.alg.spore/src/org/eclipse/elk/alg/spore/IGraphImporter.java
 */
export interface IGraphImporter<T> {
  /**
   * Create a {@link Graph} from the given graph.
   *
   * @param inputGraph the input graph
   * @returns a Graph
   */
  importGraph(inputGraph: T): Graph;

  /**
   * Apply the positions from the compact version to the original graph.
   *
   * @param graph the Graph that the new positions should be applied to
   */
  applyPositions(graph: Graph): void;

  /**
   * Update the original positions in a {@link Graph} with the modified ones.
   *
   * @param graph the {@link Graph}
   */
  updateGraph(graph: Graph): void;
}
