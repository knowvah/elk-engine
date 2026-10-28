// SPDX-License-Identifier: EPL-2.0
import type { GraphAdapters } from '../../../core/util/adapters/GraphAdapters.js';
import type { LEdge } from './LEdge.js';
import { LLabelAdapter } from './LGraphAdaptersLLabelAdapter.js';

/**
 * Adapter for {@link LEdge}s.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/graph/LGraphAdapters.java
 */
export class LEdgeAdapter implements GraphAdapters.EdgeAdapter<LEdge> {
  /** The wrapped edge. */
  private element: LEdge;
  /** List of cached label adapters. */
  private labelAdapters: GraphAdapters.LabelAdapter<unknown>[] | null = null;

  /**
   * Creates a new adapter for the given edge.
   *
   * @param edge the edge to adapt.
   */
  constructor(edge: LEdge) {
    this.element = edge;
  }

  getLabels(): Iterable<GraphAdapters.LabelAdapter<unknown>> {
    if (this.labelAdapters === null) {
      this.labelAdapters = [];
      for (const l of this.element.getLabels()) {
        this.labelAdapters.push(new LLabelAdapter(l));
      }
    }
    return this.labelAdapters;
  }
}
