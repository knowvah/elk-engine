// SPDX-License-Identifier: EPL-2.0
import type { Node } from './Node.js';

/**
 * Interface for an overlap handling function used in the {@link ScanlineOverlapCheck}.
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/spore/IOverlapHandler.java
 */
export interface IOverlapHandler {
  /**
   * This is what is done with overlapping nodes.
   *
   * @param n1 one node
   * @param n2 the other node
   */
  handle(n1: Node, n2: Node): void;
}
