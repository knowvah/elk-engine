// SPDX-License-Identifier: EPL-2.0
import { CoreOptions } from '../../core/options/CoreOptions.js';
import type { IGraphElementVisitor } from '../../core/util/IGraphElementVisitor.js';
import type { ElkGraphElement } from '../../graph/ElkGraphElement.js';
import { isElkNode, type ElkNode } from '../../graph/ElkNode.js';
import { RectPackingOptions } from './options/RectPackingOptions.js';

/**
 * Graph visitor which visits only the root node and recursively steps through the graph to set interactive options for
 * the rectpacking algorithm. The rectpacking algorithm needs `Interactive` to be set to true in all root nodes.
 *
 * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/InteractiveRectPackingGraphVisitor.java
 */
export class InteractiveRectPackingGraphVisitor implements IGraphElementVisitor {
  /** @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/InteractiveRectPackingGraphVisitor.java */
  visit(element: ElkGraphElement): void {
    // Only apply to root of the graph
    if (isElkNode(element)) {
      this.setInteractiveOptions(element);
    }
  }

  /**
   * Sets the required options for the interactive layout run with the `rectpacking` algorithm.
   *
   * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/InteractiveRectPackingGraphVisitor.java
   */
  setInteractiveOptions(root: ElkNode): void {
    const algorithm = root.getProperty(CoreOptions.ALGORITHM);
    // The reversed endsWith (the id ends with the option value) is the Java's (:47), kept verbatim.
    if (algorithm !== null && RectPackingOptions.ALGORITHM_ID.endsWith(algorithm) && !root.getChildren().isEmpty()) {
      root.setProperty(RectPackingOptions.INTERACTIVE, true);
    }
  }
}
