// SPDX-License-Identifier: EPL-2.0
import type { LNode } from '../graph/LNode.js';

/**
 * Stores the incoming and outgoing tree roots for nodes with high degrees. Java's private non-static nested class
 * `HighDegreeNodeLayeringProcessor.HighDegreeNodeInformation` (it uses no state of the outer instance), split into its
 * own file (M15).
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/HighDegreeNodeLayeringProcessor.java
 */
export class HighDegreeNodeLayeringProcessorHighDegreeNodeInformation {
  incTreesMaxHeight = -1;
  incTreeRoots: LNode[] | null = null;
  outTreesMaxHeight = -1;
  outTreeRoots: LNode[] | null = null;
}
