// SPDX-License-Identifier: EPL-2.0
import type { CGraph } from './CGraph.js';

/**
 * Transforms a graph of type T into a {@link CGraph} and applies the compacted positions back.
 *
 * @typeParam T the type of the input graph
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/compaction/oned/ICGraphTransformer.java
 */
export interface ICGraphTransformer<T> {
  /**
   * Transforms the input graph into a {@link CGraph} consisting of CNodes that may
   * be grouped in CGroups.
   *
   * @param inputGraph the graph to transform into a {@link CGraph}
   * @returns a {@link CGraph}
   */
  transform(inputGraph: T): CGraph;

  /**
   * Updates the properties of the input graph and applies the compacted positions to the
   * elements of the input graph.
   */
  applyLayout(): void;
}
