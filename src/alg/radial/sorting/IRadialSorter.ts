// SPDX-License-Identifier: EPL-2.0
import type { ElkNode } from '../../../graph/ElkNode.js';

/**
 * An interface for all ways of sorting the nodes of one radius.
 *
 * @see org.eclipse.elk.alg.radial/src/org/eclipse/elk/alg/radial/sorting/IRadialSorter.java
 */
export interface IRadialSorter {
  /** Sorts a list of nodes, which are supposed to be placed on the same radius, according to some criteria. */
  sort(nodes: ElkNode[]): void;

  /** Initializes the sorter by using the root node if necessary. */
  initialize(root: ElkNode): void;
}
