// SPDX-License-Identifier: EPL-2.0
import type { InternalEObject } from '../emf/ecore/InternalEObject.js';
import { isInstance } from './ElkGraphPackage.js';

/**
 * A bend point of an edge section. Java extends `EObject`; the port extends `InternalEObject` (see
 * `EMapPropertyHolder`).
 *
 * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkBendPoint.java
 */
export interface ElkBendPoint extends InternalEObject {
  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkBendPoint.java */
  getX(): number;

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkBendPoint.java */
  setX(value: number): void;

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkBendPoint.java */
  getY(): number;

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkBendPoint.java */
  setY(value: number): void;

  /**
   * Sets the x and the y coordinate of the bend point.
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkBendPoint.java
   */
  set(x: number, y: number): void;
}

/**
 * Java `o instanceof ElkBendPoint` (D3).
 *
 * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkBendPoint.java
 */
export function isElkBendPoint(o: unknown): o is ElkBendPoint {
  return isInstance('ElkBendPoint', o);
}
