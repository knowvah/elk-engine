// SPDX-License-Identifier: EPL-2.0
import type { EList } from '../emf/common/util/EList.js';
import type { EMapPropertyHolder } from './EMapPropertyHolder.js';
import type { ElkBendPoint } from './ElkBendPoint.js';
import type { ElkConnectableShape } from './ElkConnectableShape.js';
import type { ElkEdge } from './ElkEdge.js';
import { isInstance } from './ElkGraphPackage.js';

/**
 * One section of an edge's route: a start point, bend points and an end point.
 *
 * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkEdgeSection.java
 */
export interface ElkEdgeSection extends EMapPropertyHolder {
  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkEdgeSection.java */
  getStartX(): number;

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkEdgeSection.java */
  setStartX(value: number): void;

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkEdgeSection.java */
  getStartY(): number;

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkEdgeSection.java */
  setStartY(value: number): void;

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkEdgeSection.java */
  getEndX(): number;

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkEdgeSection.java */
  setEndX(value: number): void;

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkEdgeSection.java */
  getEndY(): number;

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkEdgeSection.java */
  setEndY(value: number): void;

  /**
   * The bend points (containment without an opposite).
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkEdgeSection.java
   */
  getBendPoints(): EList<ElkBendPoint>;

  /**
   * The edge this section belongs to; opposite of `ElkEdge.getSections()`.
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkEdgeSection.java
   */
  getParent(): ElkEdge | null;

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkEdgeSection.java */
  setParent(value: ElkEdge | null): void;

  /**
   * The shape the section starts at, if any.
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkEdgeSection.java
   */
  getOutgoingShape(): ElkConnectableShape | null;

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkEdgeSection.java */
  setOutgoingShape(value: ElkConnectableShape | null): void;

  /**
   * The shape the section ends at, if any.
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkEdgeSection.java
   */
  getIncomingShape(): ElkConnectableShape | null;

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkEdgeSection.java */
  setIncomingShape(value: ElkConnectableShape | null): void;

  /**
   * Sections continuing this one (hyperedges); opposite of `getIncomingSections()`.
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkEdgeSection.java
   */
  getOutgoingSections(): EList<ElkEdgeSection>;

  /**
   * Sections this one continues (hyperedges); opposite of `getOutgoingSections()`.
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkEdgeSection.java
   */
  getIncomingSections(): EList<ElkEdgeSection>;

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkEdgeSection.java */
  getIdentifier(): string | null;

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkEdgeSection.java */
  setIdentifier(value: string | null): void;

  /**
   * Sets the x and the y coordinate of the start point.
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkEdgeSection.java
   */
  setStartLocation(x: number, y: number): void;

  /**
   * Sets the x and the y coordinate of the end point.
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkEdgeSection.java
   */
  setEndLocation(x: number, y: number): void;
}

/**
 * Java `o instanceof ElkEdgeSection` (D3); the impl registers itself in T9.
 *
 * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkEdgeSection.java
 */
export function isElkEdgeSection(o: unknown): o is ElkEdgeSection {
  return isInstance('ElkEdgeSection', o);
}
