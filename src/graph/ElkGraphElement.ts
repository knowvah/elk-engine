// SPDX-License-Identifier: EPL-2.0
import type { EList } from '../emf/common/util/EList.js';
import type { EMapPropertyHolder } from './EMapPropertyHolder.js';
import type { ElkLabel } from './ElkLabel.js';
import { isInstance } from './ElkGraphPackage.js';

/**
 * Superclass of all graph elements that can be labeled.
 *
 * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkGraphElement.java
 */
export interface ElkGraphElement extends EMapPropertyHolder {
  /**
   * The labels; opposite of `ElkLabel.getParent()`. Adding or removing a label updates its parent.
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkGraphElement.java
   */
  getLabels(): EList<ElkLabel>;

  /**
   * The element's identifier (Java `String`, so `null` when unset).
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkGraphElement.java
   */
  getIdentifier(): string | null;

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkGraphElement.java */
  setIdentifier(value: string | null): void;
}

/**
 * Java `o instanceof ElkGraphElement` (D3).
 *
 * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/ElkGraphElement.java
 */
export function isElkGraphElement(o: unknown): o is ElkGraphElement {
  return isInstance('ElkGraphElement', o);
}
