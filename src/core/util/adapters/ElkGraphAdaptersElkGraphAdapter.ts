// SPDX-License-Identifier: EPL-2.0
import type { ElkNode } from '../../../graph/ElkNode.js';
import { AbstractElkGraphElementAdapter } from './ElkGraphAdaptersAbstractElkGraphElementAdapter.js';
import { ElkNodeAdapter } from './ElkGraphAdaptersElkNodeAdapter.js';
import type { GraphAdapters } from './GraphAdapters.js';

/**
 * Adapter for ElkGraphs rooted at a given node.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/adapters/ElkGraphAdapters.java
 */
export class ElkGraphAdapter
  extends AbstractElkGraphElementAdapter<ElkNode>
  implements GraphAdapters.GraphAdapter<ElkNode>
{
  /** cached list of child node adapters. */
  private childNodes: GraphAdapters.NodeAdapter<unknown>[] | null = null;

  /**
   * Creates a new adapter for the ElkGraph rooted at the given node (Java: private; use `ElkGraphAdapters.adapt`).
   *
   * @param node root of the ElkGraph to be adapted.
   */
  constructor(node: ElkNode) {
    super(node);
  }

  getNodes(): Iterable<GraphAdapters.NodeAdapter<unknown>> {
    if (this.childNodes === null) {
      this.childNodes = [];
      for (const n of this.element.getChildren()) {
        this.childNodes.push(new ElkNodeAdapter(this, n));
      }
    }
    return this.childNodes;
  }
}
