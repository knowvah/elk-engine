// SPDX-License-Identifier: EPL-2.0
import type { ElkEdge } from '../../../graph/ElkEdge.js';
import { ElkLabelAdapter } from './ElkGraphAdaptersElkLabelAdapter.js';
import type { GraphAdapters } from './GraphAdapters.js';

/**
 * Adapter for `ElkEdge`s. Java: private nested class (the constructor is public here only so that sibling files
 * can create instances; the class is not exported from the facade).
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/adapters/ElkGraphAdapters.java
 */
export class ElkEdgeAdapter implements GraphAdapters.EdgeAdapter<ElkEdge> {
  /** The wrapped edge. */
  private element: ElkEdge;
  /** Cached list of label adapters. */
  private labelAdapters: GraphAdapters.LabelAdapter<unknown>[] | null = null;

  /**
   * Creates a new adapter for the given edge.
   *
   * @param edge the edge to adapt.
   */
  constructor(edge: ElkEdge) {
    this.element = edge;
  }

  getLabels(): Iterable<GraphAdapters.LabelAdapter<unknown>> {
    if (this.labelAdapters === null) {
      this.labelAdapters = [];
      for (const l of this.element.getLabels()) {
        this.labelAdapters.push(new ElkLabelAdapter(l));
      }
    }
    return this.labelAdapters;
  }
}
