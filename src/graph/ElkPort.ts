// SPDX-License-Identifier: EPL-2.0
import type { ElkConnectableShape } from './ElkConnectableShape.js';
import { isInstance } from './ElkGraphPackage.js';
import type { ElkNode } from './ElkNode.js';

/**
 * A port of a node.
 *
 * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkPort.java
 */
export interface ElkPort extends ElkConnectableShape {
  /**
   * The node the port belongs to; opposite of `ElkNode.getPorts()`.
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkPort.java
   */
  getParent(): ElkNode | null;

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkPort.java */
  setParent(value: ElkNode | null): void;
}

/**
 * Java `o instanceof ElkPort` (D3); the impl registers itself in T9.
 *
 * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkPort.java
 */
export function isElkPort(o: unknown): o is ElkPort {
  return isInstance('ElkPort', o);
}
