// SPDX-License-Identifier: EPL-2.0
import type { ElkNode } from '../../../../graph/ElkNode.js';
import { RadialUtil } from '../../RadialUtil.js';
import type { IAnnulusWedgeCriteria } from './IAnnulusWedgeCriteria.js';

/**
 * Determine the annulus wedge size by the number of leafs a node has.
 *
 * @see org.eclipse.elk.alg.radial/src/org/eclipse/elk/alg/radial/p1position/wedge/AnnulusWedgeByLeafs.java
 */
export class AnnulusWedgeByLeafs implements IAnnulusWedgeCriteria {
  /**
   * Determine the space a node needs for its wedge by calculating the number of leaves.
   */
  calculateWedgeSpace(node: ElkNode): number {
    return RadialUtil.getNumberOfLeaves(node);
  }
}
