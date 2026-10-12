// SPDX-License-Identifier: EPL-2.0
import type { EList } from '../emf/common/util/EList.js';
import type { ElkConnectableShape } from './ElkConnectableShape.js';
import type { ElkEdgeSection } from './ElkEdgeSection.js';
import type { ElkGraphElement } from './ElkGraphElement.js';
import { isInstance } from './ElkGraphPackage.js';
import type { ElkNode } from './ElkNode.js';

/**
 * An edge between connectable shapes, possibly a hyperedge.
 *
 * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkEdge.java
 */
export interface ElkEdge extends ElkGraphElement {
  /**
   * The node the edge is contained in (unrelated to what it connects); opposite of
   * `ElkNode.getContainedEdges()`.
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkEdge.java
   */
  getContainingNode(): ElkNode | null;

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkEdge.java */
  setContainingNode(value: ElkNode | null): void;

  /**
   * The source shapes; opposite of `ElkConnectableShape.getOutgoingEdges()`.
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkEdge.java
   */
  getSources(): EList<ElkConnectableShape>;

  /**
   * The target shapes; opposite of `ElkConnectableShape.getIncomingEdges()`.
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkEdge.java
   */
  getTargets(): EList<ElkConnectableShape>;

  /**
   * The sections that define the routing; opposite of `ElkEdgeSection.getParent()`.
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkEdge.java
   */
  getSections(): EList<ElkEdgeSection>;

  /**
   * More than one source or more than one target (computed).
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkEdge.java
   */
  isHyperedge(): boolean;

  /**
   * Sources and targets do not all have the same parent node (computed).
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkEdge.java
   */
  isHierarchical(): boolean;

  /**
   * All sources and targets are the same node or its ports (computed).
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkEdge.java
   */
  isSelfloop(): boolean;

  /**
   * At least one source and one target (computed).
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkEdge.java
   */
  isConnected(): boolean;
}

/**
 * Java `o instanceof ElkEdge` (D3); the impl registers itself in T9.
 *
 * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkEdge.java
 */
export function isElkEdge(o: unknown): o is ElkEdge {
  return isInstance('ElkEdge', o);
}
