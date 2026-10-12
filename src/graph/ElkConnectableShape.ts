// SPDX-License-Identifier: EPL-2.0
import type { EList } from '../emf/common/util/EList.js';
import type { ElkEdge } from './ElkEdge.js';
import { isInstance } from './ElkGraphPackage.js';
import type { ElkShape } from './ElkShape.js';

/**
 * A shape edges can connect to (nodes and ports).
 *
 * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkConnectableShape.java
 */
export interface ElkConnectableShape extends ElkShape {
  /**
   * Edges with this shape among their sources; opposite of `ElkEdge.getSources()`.
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkConnectableShape.java
   */
  getOutgoingEdges(): EList<ElkEdge>;

  /**
   * Edges with this shape among their targets; opposite of `ElkEdge.getTargets()`.
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkConnectableShape.java
   */
  getIncomingEdges(): EList<ElkEdge>;
}

/**
 * Java `o instanceof ElkConnectableShape` (D3); the impl registers itself in T9.
 *
 * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkConnectableShape.java
 */
export function isElkConnectableShape(o: unknown): o is ElkConnectableShape {
  return isInstance('ElkConnectableShape', o);
}
