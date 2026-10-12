// SPDX-License-Identifier: EPL-2.0
import type { EList } from '../emf/common/util/EList.js';
import type { ElkConnectableShape } from './ElkConnectableShape.js';
import type { ElkEdge } from './ElkEdge.js';
import { isInstance } from './ElkGraphPackage.js';
import type { ElkPort } from './ElkPort.js';

/**
 * A node, possibly with ports, child nodes and contained edges.
 *
 * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkNode.java
 */
export interface ElkNode extends ElkConnectableShape {
  /**
   * The ports; opposite of `ElkPort.getParent()`.
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkNode.java
   */
  getPorts(): EList<ElkPort>;

  /**
   * The child nodes; opposite of `getParent()`.
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkNode.java
   */
  getChildren(): EList<ElkNode>;

  /**
   * The parent node; opposite of `getChildren()`.
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkNode.java
   */
  getParent(): ElkNode | null;

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkNode.java */
  setParent(value: ElkNode | null): void;

  /**
   * Edges contained in (not necessarily connected to) this node; opposite of
   * `ElkEdge.getContainingNode()`.
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkNode.java
   */
  getContainedEdges(): EList<ElkEdge>;

  /**
   * Whether this node has children (computed).
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkNode.java
   */
  isHierarchical(): boolean;
}

/**
 * Java `o instanceof ElkNode` (D3); the impl registers itself in T9.
 *
 * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkNode.java
 */
export function isElkNode(o: unknown): o is ElkNode {
  return isInstance('ElkNode', o);
}
