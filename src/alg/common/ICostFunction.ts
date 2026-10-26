// SPDX-License-Identifier: EPL-2.0
import type { TEdge } from './TEdge.js';

/**
 * A cost function for edges, as used by the spanning tree construction.
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/ICostFunction.java
 */
export interface ICostFunction {
  /**
   * Cost of an edge.
   *
   * @param edge the edge
   * @returns cost associated with an edge created in the structure phase
   */
  cost(edge: TEdge): number;
}
