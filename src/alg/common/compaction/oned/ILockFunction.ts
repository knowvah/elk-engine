// SPDX-License-Identifier: EPL-2.0
import type { Direction } from '../../../../core/options/Direction.js';
import type { CNode } from './CNode.js';

/**
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/compaction/oned/ILockFunction.java
 */
export interface ILockFunction {
  /**
   * @param node the node
   * @param direction the direction
   * @returns whether the passed node may move in the passed direction.
   */
  isLocked(node: CNode, direction: Direction): boolean;
}
