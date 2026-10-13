// SPDX-License-Identifier: EPL-2.0
import type { ElkGraphElement } from '../../graph/ElkGraphElement.js';

/**
 * Interface for visitors of graph elements.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/IGraphElementVisitor.java
 */
export interface IGraphElementVisitor {
  /**
   * Visit the given graph element.
   *
   * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/IGraphElementVisitor.java
   */
  visit(element: ElkGraphElement): void;
}
