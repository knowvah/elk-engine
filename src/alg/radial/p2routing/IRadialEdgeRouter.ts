// SPDX-License-Identifier: EPL-2.0
import type { ElkNode } from '../../../graph/ElkNode.js';

/**
 * An interface for routing edges in a radial layout.
 *
 * @see org.eclipse.elk.alg.radial/src/org/eclipse/elk/alg/radial/p2routing/IRadialEdgeRouter.java
 */
export interface IRadialEdgeRouter {
  /** Routes the edges of a graph, given the root node of the graph. */
  routeEdges(root: ElkNode): void;
}
