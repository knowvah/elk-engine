// SPDX-License-Identifier: EPL-2.0
import type { ElkGraphElement } from './ElkGraphElement.js';
import { isInstance } from './ElkGraphPackage.js';

/**
 * A graph element with a position and a size.
 *
 * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkShape.java
 */
export interface ElkShape extends ElkGraphElement {
  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkShape.java */
  getHeight(): number;

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkShape.java */
  setHeight(value: number): void;

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkShape.java */
  getWidth(): number;

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkShape.java */
  setWidth(value: number): void;

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkShape.java */
  getX(): number;

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkShape.java */
  setX(value: number): void;

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkShape.java */
  getY(): number;

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkShape.java */
  setY(value: number): void;

  /**
   * Sets the width and the height of the shape.
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkShape.java
   */
  setDimensions(width: number, height: number): void;

  /**
   * Sets the x and the y coordinate of the shape.
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkShape.java
   */
  setLocation(x: number, y: number): void;
}

/**
 * Java `o instanceof ElkShape` (D3).
 *
 * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkShape.java
 */
export function isElkShape(o: unknown): o is ElkShape {
  return isInstance('ElkShape', o);
}
