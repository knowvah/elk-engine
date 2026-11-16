// SPDX-License-Identifier: EPL-2.0
import type { ElkNode } from '../../../../graph/ElkNode.js';
import { RadialUtil } from '../../RadialUtil.js';
import type { IAnnulusWedgeCriteria } from './IAnnulusWedgeCriteria.js';

/**
 * Determine the annulus wedge size by calculating the diameter of an node.
 *
 * @see org.eclipse.elk.alg.radial/src/org/eclipse/elk/alg/radial/p1position/wedge/AnnulusWedgeByNodeSpace.java
 */
export class AnnulusWedgeByNodeSpace implements IAnnulusWedgeCriteria {
  /**
   * Determine the space a node needs for its wedge by calculating the diagonal.
   */
  calculateWedgeSpace(node: ElkNode): number {
    const successors = RadialUtil.getSuccessors(node);
    const height = node.getHeight();
    const width = node.getWidth();
    const nodeSize = Math.sqrt(height * height + width * width);

    let childSpace = 0;
    for (const child of successors) {
      childSpace += this.calculateWedgeSpace(child);
    }
    return Math.max(childSpace, nodeSize);
  }
}
