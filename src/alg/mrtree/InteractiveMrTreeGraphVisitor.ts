// SPDX-License-Identifier: EPL-2.0
import { CoreOptions } from '../../core/options/CoreOptions.js';
import type { IGraphElementVisitor } from '../../core/util/IGraphElementVisitor.js';
import type { ElkGraphElement } from '../../graph/ElkGraphElement.js';
import { isElkNode, type ElkNode } from '../../graph/ElkNode.js';
import { MrTreeOptions } from './options/MrTreeOptions.js';
import { OrderWeighting } from './options/OrderWeighting.js';

/**
 * Graph visitor which visits only the root node and recursively steps through the graph to set interactive options for
 * the mrtree algorithm. The mrtree algorithm needs `Interactive` to be set to true in all root nodes.
 *
 * @see org.eclipse.elk.alg.mrtree/src/org/eclipse/elk/alg/mrtree/InteractiveMrTreeGraphVisitor.java
 */
export class InteractiveMrTreeGraphVisitor implements IGraphElementVisitor {
  /** @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/IGraphElementVisitor.java */
  visit(element: ElkGraphElement): void {
    // Only apply to root of the graph
    if (isElkNode(element)) {
      const root = element;
      this.setInteractiveOptions(root);
    }
  }

  /** Sets the required options for the interactive layout run with the `rectpacking` algorithm. */
  setInteractiveOptions(root: ElkNode): void {
    // an unset ALGORITHM reads as the Java `null` default (typed `string` by the property)
    const algorithm = root.getProperty(CoreOptions.ALGORITHM) as string | null;
    if (algorithm !== null && MrTreeOptions.ALGORITHM_ID.endsWith(algorithm) && !root.getChildren().isEmpty()) {
      root.setProperty(CoreOptions.INTERACTIVE, true);
      root.setProperty(MrTreeOptions.WEIGHTING, OrderWeighting.CONSTRAINT);
    }
  }
}
