// SPDX-License-Identifier: EPL-2.0
import type { KVector } from '../../core/math/KVector.js';
import type { ElkNode } from '../../graph/ElkNode.js';

/**
 * A node arranger has to provide a size prediction without computing a layout.
 *
 * @see org.eclipse.elk.alg.topdownpacking/src/org/eclipse/elk/alg/topdownpacking/INodeArranger.java
 */
export interface INodeArranger {
  /**
   * Computes the predicted required size of the graph and returns it without computing a full layout.
   *
   * @param graph the input graph
   * @returns the predicted size
   */
  getPredictedSize(graph: ElkNode): KVector;
}
