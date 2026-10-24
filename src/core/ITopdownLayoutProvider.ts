// SPDX-License-Identifier: EPL-2.0
import type { ElkNode } from '../graph/ElkNode.js';
import type { KVector } from './math/KVector.js';

/**
 * Interface for layout providers that can predict the size a graph will have after layout, as required by
 * top-down layout.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/ITopdownLayoutProvider.java
 */
export interface ITopdownLayoutProvider {
  /**
   * Computes the size that will be required of the graph to fit the layout once it has been calculated.
   *
   * @param graph the graph to predict the size of
   * @returns the predicted size
   */
  getPredictedGraphSize(graph: ElkNode): KVector;
}
