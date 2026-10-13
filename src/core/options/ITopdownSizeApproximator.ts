// SPDX-License-Identifier: EPL-2.0
import type { ElkNode } from '../../graph/ElkNode.js';
import type { JavaInterfaceToken } from '../../java/lang/JavaClass.js';
import { javaInterface } from '../../java/lang/JavaClass.js';
import type { KVector } from '../math/KVector.js';

/**
 * A topdown size approximator returns an estimated size of the graph drawing after performing
 * layout using some heuristic.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/options/ITopdownSizeApproximator.java
 */
export interface ITopdownSizeApproximator {
  /**
   * Returns an approximated required size for a given node.
   *
   * @param node the node
   * @returns the size as a vector
   */
  getSize(node: ElkNode): KVector;
}

/** The class object (`ITopdownSizeApproximator.class`) of the interface. */
// eslint-disable-next-line @typescript-eslint/no-redeclare
export const ITopdownSizeApproximator: JavaInterfaceToken = javaInterface('ITopdownSizeApproximator');
