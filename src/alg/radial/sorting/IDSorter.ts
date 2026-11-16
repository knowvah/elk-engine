// SPDX-License-Identifier: EPL-2.0
import type { ElkNode } from '../../../graph/ElkNode.js';
import { RadialOptions } from '../options/RadialOptions.js';
import type { IRadialSorter } from './IRadialSorter.js';

/**
 * Sort nodes by the {@link RadialOptions.ORDER_ID} option.
 *
 * @see org.eclipse.elk.alg.radial/src/org/eclipse/elk/alg/radial/sorting/IDSorter.java
 */
export class IDSorter implements IRadialSorter {
  /**
   * Define how to compare two nodes by {@link RadialOptions.ORDER_ID} (`Integer.compareTo`).
   */
  private readonly idSorter = (node1: ElkNode, node2: ElkNode): number => {
    const orderID1 = node1.getProperty(RadialOptions.ORDER_ID);
    const orderID2 = node2.getProperty(RadialOptions.ORDER_ID);
    return orderID1 < orderID2 ? -1 : orderID1 === orderID2 ? 0 : 1;
  };

  /**
   * Sort nodes by the {@link RadialOptions.ORDER_ID} option.
   */
  sort(nodes: ElkNode[]): void {
    nodes.sort(this.idSorter);
  }

  initialize(root: ElkNode): void {
    // nothing to do here
  }
}
