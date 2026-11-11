// SPDX-License-Identifier: EPL-2.0
import type { ElkNode } from '../../../../graph/ElkNode.js';

/**
 * An interface for defining how the annulus wedge is determined.
 *
 * @see org.eclipse.elk.alg.radial/src/org/eclipse/elk/alg/radial/p1position/wedge/IAnnulusWedgeCriteria.java
 */
export interface IAnnulusWedgeCriteria {
  /** Calculates the space a node, which shall be placed in a wedge, requires for its wedge. */
  calculateWedgeSpace(node: ElkNode): number;
}
