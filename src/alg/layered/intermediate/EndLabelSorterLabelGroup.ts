// SPDX-License-Identifier: EPL-2.0
import type { GraphAdapters } from '../../../core/util/adapters/GraphAdapters.js';
import type { LEdge } from '../graph/LEdge.js';

/**
 * A group of labels that have a certain order and belong to a single edge. Label groups know the ultimate source and
 * target of the edge they belong to, and can be sorted. Since this is an internal class, we don't bother with
 * accessors.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/EndLabelSorter.java:197
 */
export class EndLabelSorterLabelGroup {
  /** The edge the labels belong to. This can be a dummy edge if the original edge was broken by a label dummy. */
  readonly edge: LEdge;
  /** List of labels that belong to this group. The order of these labels will never be changed. */
  readonly labels: GraphAdapters.LabelAdapter<unknown>[] = [];

  constructor(edge: LEdge) {
    // EndLabelSorter.java:206 `this.labels.addAll(labels)` adds the (empty) field to itself: a no-op, omitted.
    this.edge = edge;
  }
}
