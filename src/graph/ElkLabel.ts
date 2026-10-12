// SPDX-License-Identifier: EPL-2.0
import type { ElkGraphElement } from './ElkGraphElement.js';
import { isInstance } from './ElkGraphPackage.js';
import type { ElkShape } from './ElkShape.js';

/**
 * A label attached to a graph element (labels can be labeled too).
 *
 * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkLabel.java
 */
export interface ElkLabel extends ElkShape {
  /**
   * The labeled element; opposite of `ElkGraphElement.getLabels()`.
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkLabel.java
   */
  getParent(): ElkGraphElement | null;

  /**
   * Sets the labeled element, updating both elements' label lists.
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkLabel.java
   */
  setParent(value: ElkGraphElement | null): void;

  /**
   * The label's text, `""` by default (Java `String`, so it may be set to `null`).
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkLabel.java
   */
  getText(): string | null;

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkLabel.java */
  setText(value: string | null): void;
}

/**
 * Java `o instanceof ElkLabel` (D3).
 *
 * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkLabel.java
 */
export function isElkLabel(o: unknown): o is ElkLabel {
  return isInstance('ElkLabel', o);
}
